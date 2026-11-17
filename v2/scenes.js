/* =====================================================================
   Background physics scene (faint graphite, behind section content):
   - #contact      : pulsed electron beam fracturing rock (half speed, soft)
   (The Faraday cup behind Research and the collider display behind Publications were removed: calmer reading sections.)
   Each scene only animates while its section is on screen. Reduced-motion: one still frame.
   ===================================================================== */
(function () {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const small = () => window.innerWidth < 760;
    const INK = a => `rgba(${window.cvInkRGB || '29, 29, 31'}, ${Math.max(0, a).toFixed(3)})`;
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
        t *= 0.5; dt *= 0.5;                                                  // half speed: a calm closing scene
        S.ctx.globalAlpha = 0.65;                                             // and a little fainter
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
            ctx.fillStyle = INK(0.035); ctx.strokeStyle = INK(0.22);
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
