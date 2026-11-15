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

    // ---------------------------------------------------------------- ion thruster
    scene('research', () => (small() ? 360 : 460), S => {
        const sm = small();
        const s = { x0: sm ? -30 : Math.max(-20, (S.W - 1280) / 2 - 40), y0: sm ? 120 : 190, ap: sm ? 34 : 52, ions: [], el: [] };
        const n = sm ? 70 : 150;
        for (let i = 0; i < n; i++) s.ions.push(spawnIon(s, S, true));
        for (let i = 0; i < (sm ? 3 : 5); i++) s.el.push({ ph: Math.random() * 6.3, r: 6 + Math.random() * 10, w: 3 + Math.random() * 3 });
        return s;
    }, (S, t, dt) => {
        const { ctx } = S, s = S.s, gx = s.x0 + 120;
        // thruster body: discharge chamber outline + magnet rings
        ctx.lineWidth = 1;
        ctx.strokeStyle = INK(0.16);
        ctx.strokeRect(s.x0, s.y0 - s.ap - 18, 120, 2 * s.ap + 36);
        ctx.strokeStyle = INK(0.1);
        for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(s.x0 + k * 30, s.y0 - s.ap - 18); ctx.lineTo(s.x0 + k * 30, s.y0 - s.ap - 24); ctx.moveTo(s.x0 + k * 30, s.y0 + s.ap + 18); ctx.lineTo(s.x0 + k * 30, s.y0 + s.ap + 24); ctx.stroke(); }
        // screen + accel grids (dashed = apertures)
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = INK(0.3);
        ctx.beginPath(); ctx.moveTo(gx, s.y0 - s.ap - 10); ctx.lineTo(gx, s.y0 + s.ap + 10); ctx.moveTo(gx + 7, s.y0 - s.ap - 10); ctx.lineTo(gx + 7, s.y0 + s.ap + 10); ctx.stroke();
        ctx.setLineDash([]);
        // plume envelope
        ctx.strokeStyle = INK(0.05);
        const spread = Math.tan(0.24), Lp = S.W * 0.95;
        ctx.beginPath(); ctx.moveTo(gx + 8, s.y0 - s.ap); ctx.lineTo(gx + Lp, s.y0 - s.ap - Lp * spread); ctx.moveTo(gx + 8, s.y0 + s.ap); ctx.lineTo(gx + Lp, s.y0 + s.ap + Lp * spread); ctx.stroke();
        // ions: short streaks, fading with distance
        ctx.lineCap = 'round';
        for (let i = 0; i < s.ions.length; i++) {
            const p = s.ions[i];
            p.x += p.vx * dt; p.y += p.vy * dt;
            const d = (p.x - gx) / (S.W * 0.9);
            if (d > 1 || p.y < -10 || p.y > S.H + 10) { s.ions[i] = spawnIon(s, S, false); continue; }
            ctx.strokeStyle = INK(0.34 * (1 - d) * p.a);
            ctx.beginPath(); ctx.moveTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035); ctx.lineTo(p.x, p.y); ctx.stroke();
        }
        // neutraliser electrons looping just past the grids
        ctx.fillStyle = INK(0.35);
        for (const e of s.el) {
            const a = e.ph + t * e.w;
            const ex = gx + 26 + Math.cos(a) * e.r, ey = s.y0 + s.ap + 24 + Math.sin(a * 1.3) * e.r * 0.6;
            ctx.beginPath(); ctx.arc(ex, ey, 1.3, 0, Math.PI * 2); ctx.fill();
        }
    });
    function spawnIon(s, S, anywhere) {
        const gx = s.x0 + 128, off = (Math.random() * 2 - 1) * s.ap;
        const ang = (off / s.ap) * 0.14 + (Math.random() - 0.5) * 0.12;   // beamlets diverge with aperture position
        const v = 150 + Math.random() * 110;
        const p = { x: gx, y: s.y0 + off, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, a: 0.5 + Math.random() * 0.5 };
        if (anywhere) { const k = Math.random() * S.W * 0.85 / v; p.x += p.vx * k; p.y += p.vy * k; }
        return p;
    }

    // ---------------------------------------------------------------- collider event display
    scene('publications', () => (small() ? 560 : 820), S => {
        const W = S.W, wrapW = Math.min(W, 1280) - 44, left = (W - wrapW) / 2;
        const wide = W >= 1200;
        return {
            cx: wide ? left + wrapW * 0.2 : W / 2,
            cy: wide ? 560 : (small() ? 330 : 420),
            sc: small() ? 0.62 : (wide ? 0.95 : 0.8),
            a: wide ? 1 : 0.6,                                                // fainter where it sits behind text
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
        const { ctx } = S, s = S.s, by = s.ry, x0 = 0, hitX = s.rx - s.r * 0.95;
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
        const n = 15, out = [];
        for (let k = 0; k < n; k++) {
            const a = k / n * Math.PI * 2, rr = s.r * (0.78 + Math.random() * 0.32);
            out.push([s.rx + Math.cos(a) * rr * 1.15, s.ry - Math.abs(Math.sin(a)) * rr * 0.1 + Math.sin(a) * rr * 0.75]);
        }
        s.verts = out; s.cracks = []; s.hits = 0; s.broken = -1; s.bunches = [];
    }
    function crack(s) {
        const pts = [[s.rx - s.r * 0.95, s.ry]];
        let [x, y] = pts[0], a = (Math.random() - 0.5) * 0.9;
        const steps = 5 + Math.floor(Math.random() * 6);
        for (let i = 0; i < steps; i++) { a += (Math.random() - 0.5) * 0.9; x += Math.cos(a) * s.r * 0.18; y += Math.sin(a) * s.r * 0.18; pts.push([x, y]); }
        s.cracks.push(pts);
    }
    function impact(s) {
        s.hits++;
        crack(s);
        const hx = s.rx - s.r * 0.95;
        // chip the face the beam hits
        s.verts = s.verts.map(([x, y]) => (x < s.rx - s.r * 0.4 && Math.abs(y - s.ry) < s.r * 0.6) ? [x + s.r * 0.06, y] : [x, y]);
        for (let i = 0; i < 6; i++) s.frags.push({ x: hx, y: s.ry, vx: -40 - Math.random() * 120, vy: -120 - Math.random() * 160, rot: 0, vr: (Math.random() - 0.5) * 8, sz: 2 + Math.random() * 4, life: 1 });
        if (s.hits >= 9) {                                                    // fracture: the whole rock bursts into fragments
            for (const [vx, vy] of s.verts) s.frags.push({ x: vx, y: vy, vx: (vx - s.rx) * 2.2 + (Math.random() - 0.5) * 60, vy: -80 - Math.random() * 180, rot: 0, vr: (Math.random() - 0.5) * 10, sz: 4 + Math.random() * 7, life: 1.2 });
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
