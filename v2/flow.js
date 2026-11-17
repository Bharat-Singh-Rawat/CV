/* =====================================================================
   Two quiet touches:
   1. Ion trail: moving the mouse sheds a few faint ions that curl away like
      charged particles in a magnetic field, then fade (desktop only).
   2. Section blend: the black lab section fades in from the white page as you
      scroll towards it, and back out again, instead of a hard edge.
   ===================================================================== */
(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = document.documentElement;

    // ---------- 1. ion trail ----------
    if (!reduce && matchMedia('(hover: hover) and (pointer: fine)').matches) {
        const cv = document.createElement('canvas');
        cv.className = 'ion-trail'; cv.setAttribute('aria-hidden', 'true');
        document.body.appendChild(cv);
        const ctx = cv.getContext('2d');
        let dpr = 1, W = 0, H = 0, raf = 0, last = 0, px = -1, py = -1, onDark = false;
        const ions = [];
        const size = () => { dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; };
        size(); addEventListener('resize', size);

        addEventListener('pointermove', e => {
            if (e.pointerType !== 'mouse') return;
            const x = e.clientX, y = e.clientY;
            if (px < 0) { px = x; py = y; return; }
            const d = Math.hypot(x - px, y - py);
            onDark = !!(e.target.closest && e.target.closest('.dark, .vmodal, .pv'));
            const n = Math.min(2, Math.floor(d / 14));      // only when the mouse really moves; a few at a time
            for (let k = 0; k < n && ions.length < 70; k++) {
                const a = Math.random() * Math.PI * 2, v = 0.025 + Math.random() * 0.045;
                ions.push({
                    x: x + (Math.random() - 0.5) * 6, y: y + (Math.random() - 0.5) * 6,
                    vx: Math.cos(a) * v - (x - px) * 0.0015, vy: Math.sin(a) * v - (y - py) * 0.0015,
                    w: (Math.random() < 0.5 ? -1 : 1) * (0.0035 + Math.random() * 0.004),   // cyclotron turn rate, sign = charge
                    age: 0, life: 700 + Math.random() * 500, dark: onDark
                });
            }
            px = x; py = y;
            if (!raf && ions.length) { last = 0; raf = requestAnimationFrame(frame); }
        }, { passive: true });

        function frame(now) {
            const dt = Math.min(40, now - (last || now)); last = now;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, W, H);
            const darkTheme = root.dataset.theme === 'dark';
            ctx.lineCap = 'round';
            for (let i = ions.length - 1; i >= 0; i--) {
                const p = ions[i];
                p.age += dt;
                if (p.age >= p.life) { ions.splice(i, 1); continue; }
                const c = Math.cos(p.w * dt), s = Math.sin(p.w * dt);        // rotate the velocity: a curling path
                const vx = p.vx * c - p.vy * s, vy = p.vx * s + p.vy * c;
                const drag = Math.exp(-dt / 900);
                p.vx = vx * drag; p.vy = vy * drag;
                const ox = p.x, oy = p.y;
                p.x += p.vx * dt; p.y += p.vy * dt;
                const t = p.age / p.life, al = 0.32 * (1 - t) * (1 - t);
                const ink = p.dark || darkTheme ? '245,245,247' : '29,29,31';
                ctx.strokeStyle = `rgba(${ink},${al.toFixed(3)})`; ctx.lineWidth = 1.4 * (1 - t * 0.5);
                ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(p.x, p.y); ctx.stroke();
                ctx.fillStyle = `rgba(${ink},${(al * 1.2).toFixed(3)})`;
                ctx.beginPath(); ctx.arc(p.x, p.y, 1.1, 0, 6.283); ctx.fill();
            }
            raf = ions.length ? requestAnimationFrame(frame) : 0;
            if (!raf) ctx.clearRect(0, 0, W, H);
        }
    }

    // ---------- 2. section blend into and out of the black lab ----------
    const lab = document.getElementById('lab');
    if (lab && lab.classList.contains('dark')) {
        const rgb = el => { const m = el && getComputedStyle(el).backgroundColor.match(/[\d.]+/g); return m && m.length >= 3 && (m.length < 4 || +m[3] > 0) ? m.slice(0, 3).map(Number) : [255, 255, 255]; };
        let before = [255, 255, 255], after = [255, 255, 255], tk = 0;
        const head = lab.querySelector('.lab-head') || lab;
        const read = () => { lab.style.background = ''; before = rgb(lab.previousElementSibling); after = rgb(lab.nextElementSibling); paint(); };
        const mix = (a, t) => `rgb(${a.map(v => Math.round(v * (1 - t))).join(',')})`;       // towards black
        const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 1.6);
        function paint() {
            tk = 0;
            const r = lab.getBoundingClientRect(), vh = innerHeight;
            const enter = ease((vh - r.top) / (vh * 0.6));               // top edge: bottom of screen → 40% up
            const leave = ease((r.bottom - vh * 0.15) / (vh * 0.55));    // bottom edge: 70% → 15% of the screen
            // keep the heading readable while the background behind it is still pale
            const lum = a => a.reduce((x, y) => x + y) / 3;
            if (enter < 1) {
                const f = Math.min(1, Math.max(0, (head.getBoundingClientRect().top - r.top + 40) / (vh * 0.5)));   // where the heading sits in the top gradient
                const top = lum(before) * (1 - enter ** 6), mid = lum(before) * (1 - enter);
                lab.classList.toggle('lab-light', top + (mid - top) * f > 125);
            } else lab.classList.toggle('lab-light', lum(after) * (1 - leave) > 125);
            if (enter >= 1 && leave >= 1) { lab.style.background = '#000'; return; }
            // no hard line: the top of the section starts in the colour above it and melts into the darkening middle
            const mid = enter < 1 ? mix(before, enter) : mix(after, leave);
            lab.style.background = `linear-gradient(180deg, ${mix(before, enter ** 6)} 0, ${mid} 50vh, ${mid} calc(100% - 50vh), ${mix(after, leave ** 6)} 100%)`;
        }
        addEventListener('scroll', () => { if (!tk) tk = requestAnimationFrame(paint); }, { passive: true });
        addEventListener('resize', read);
        new MutationObserver(read).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
        read();
    }
})();
