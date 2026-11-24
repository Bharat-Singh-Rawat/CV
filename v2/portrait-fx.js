/* About photo "gather" effect: the photo stays a normal photo until the cursor comes near,
   then it breaks into coloured dust that drifts off and gathers back; moving away settles it
   into the photo again. Dots follow the same black & white -> colour scroll fade (--colour). */
(() => {
    // Reduce Motion: nothing moves on its own (no hover trigger, no auto-play), but a tap / click still plays it
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const CUTOUT = '/CV/v2/img/profile-cutout.webp';   // profile.webp with the background removed, same framing
    const NEAR = 60;                                    // px around the photo that counts as "near"
    const LENS2 = 2 * 46 * 46;                          // cursor lens: gaussian radius ~46 px
    const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
    const ease = x => 1 - Math.pow(1 - clamp(x), 4);
    const rnd = (a, b) => a + Math.random() * (b - a);

    function start(fig) {
        const zoom = fig.querySelector('.zoom'), photo = zoom && zoom.querySelector('img');
        if (!photo) return;
        const src = new Image(); src.src = CUTOUT;
        src.decode().then(() => {
            const cv = document.createElement('canvas');
            cv.setAttribute('aria-hidden', 'true');
            cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
            zoom.style.position = 'relative';
            zoom.append(cv);
            const ctx = cv.getContext('2d');
            let W = 0, H = 0, dpr = 1, dots = [], near = false, hov = false, ht = 0, photoA = 1, last = 0, raf = 0;
            const mouse = { x: 0, y: 0, in: false };
            // phones: tilting slides the dust like particles under gravity (only while it is dust; the photo never moves)
            const tilt = { x: 0, y: 0, tx: 0, ty: 0, base: null, on: false };
            const onTilt = e => {
                if (e.beta == null || e.gamma == null) return;
                const a = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
                let x = e.gamma, y = e.beta;                                     // portrait: left-right, front-back
                if (a === 90) { x = e.beta; y = -e.gamma; } else if (a === -90 || a === 270) { x = -e.beta; y = e.gamma; }
                if (tilt.base === null) tilt.base = y;                         // however the phone is held right now counts as level
                const rad = Math.PI / 180;
                tilt.tx = Math.sin(Math.max(-60, Math.min(60, x)) * rad);
                tilt.ty = Math.sin(Math.max(-60, Math.min(60, y - tilt.base)) * rad);
            };
            // iPhone needs permission, asked from a real button (the most reliable gesture for Safari's prompt)
            const needsAsk = typeof (window.DeviceOrientationEvent && DeviceOrientationEvent.requestPermission) === 'function';
            const pill = document.createElement('button');
            pill.type = 'button'; pill.className = 'tilt-pill'; pill.hidden = true;
            pill.textContent = 'Enable tilt';
            if (getComputedStyle(fig).position === 'static') fig.style.position = 'relative';
            fig.appendChild(pill);
            let pillMsgT = 0;
            const say = (msg, ms) => { pill.textContent = msg; pill.hidden = false; clearTimeout(pillMsgT); if (ms) pillMsgT = setTimeout(() => { pill.hidden = true; pillMsgT = 0; pill.textContent = 'Enable tilt'; }, ms); };
            const enableTilt = fromTap => {
                if (tilt.on || tilt.asking || !matchMedia('(hover: none)').matches || !('DeviceOrientationEvent' in window)) return;
                const go = () => { tilt.on = true; addEventListener('deviceorientation', onTilt); };
                if (!needsAsk) return go();                                    // Android: no prompt
                if (!fromTap) return;
                tilt.asking = true;
                DeviceOrientationEvent.requestPermission().then(r => {
                    tilt.asking = false;
                    if (r === 'granted') { go(); say('Tilt your phone', 1800); }
                    else { tilt.denied = true; say('Motion access is off for this site', 3000); }
                }).catch(err => { tilt.asking = false; say('Tap “Enable tilt” again', 2500); });
            };
            pill.addEventListener('click', e => { e.stopPropagation(); if (!tilt.on) enableTilt(true); });

            const build = () => {
                const r = zoom.getBoundingClientRect(); if (!r.width) return;
                W = r.width; H = r.height; dpr = Math.min(2, devicePixelRatio || 1);
                cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
                const cols = Math.round(clamp(W / 3.2, 90, 150)), rows = Math.round(cols * H / W);
                const g = document.createElement('canvas'); g.width = cols; g.height = rows;
                const gx = g.getContext('2d', { willReadFrequently: true });
                // same object-fit: cover framing as the <img>
                const s = Math.max(cols / src.naturalWidth, rows / src.naturalHeight), dw = src.naturalWidth * s, dh = src.naturalHeight * s;
                gx.drawImage(src, (cols - dw) / 2, (rows - dh) / 2, dw, dh);
                const d = gx.getImageData(0, 0, cols, rows).data, cw = W / cols, ch = H / rows;
                const lum = i => 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
                dots = [];
                for (let i = 0; i < cols * rows; i++) {
                    if (d[i * 4 + 3] < 128) continue;
                    const R = d[i * 4], G = d[i * 4 + 1], B = d[i * 4 + 2], L = 0.299 * R + 0.587 * G + 0.114 * B;
                    const w = clamp((235 - L) / 200);                      // darker = slightly denser and bigger
                    if (Math.random() > 0.78 + 0.22 * w) continue;
                    const cx = i % cols, cy = i / cols | 0;
                    // detail: local contrast (eyes, brows, mouth, hairline, shirt checks), weighted to the face in the upper middle
                    const n = (a, b) => (a >= 0 && a < cols && b >= 0 && b < rows && d[(b * cols + a) * 4 + 3] > 128) ? lum(b * cols + a) : L;
                    const edge = clamp((Math.abs(n(cx + 1, cy) - n(cx - 1, cy)) + Math.abs(n(cx, cy + 1) - n(cx, cy - 1))) / 90);
                    const face = clamp(1 - Math.hypot((cx / cols - 0.5) / 0.22, (cy / rows - 0.36) / 0.26));
                    const f = clamp(edge * (0.45 + 0.55 * face) + 0.35 * face);   // 0 = background-ish, 1 = a feature
                    const x = (cx + rnd(0.15, 0.85)) * cw, y = (cy + rnd(0.15, 0.85)) * ch;
                    dots.push({ R, G, B, L, w, f, x, y, ph: rnd(0, 6.283),
                        d: 0.15 * x / W + 0.75 * f + rnd(0, 0.25),          // dissolve order: outline and shirt first, the face last
                        g: 0.75 * (1 - f) + rnd(0, 0.25),                     // gather order: the face first, then the rest
                        dr: rnd(0.25, 0.6) * (1 - 0.45 * f),                  // features don't wander as far
                        big: f > 0.6 && Math.random() < 0.14 || Math.random() < 0.015,   // accent dots: a little larger and richer
                        ox: 0, oy: 0, vx: 0, vy: 0, a: 1 });
                }
            };

            const frame = now => {
                const t = now / 1000, dt = Math.min(0.05, last ? t - last : 0.016); last = t;
                if (near && !hov) ht = 0;                                   // each approach starts the cycle fresh
                hov = near; if (hov) ht += dt;
                const tc = ht % 9;                                          // near: dissolve 0.3-4.5 s, gather back 4.5-9 s
                const colour = clamp(parseFloat(fig.style.getPropertyValue('--colour')) || 0);
                const dark = document.documentElement.dataset.theme === 'dark', k = dark ? 1.15 : 0.82, sat = dark ? 1.15 : 1.4;   // light mode: darker and richer, so it reads as a portrait, not grey static
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
                let sumA = 0, moving = false;
                if (tilt.on) { tilt.x += (tilt.tx - tilt.x) * 0.12; tilt.y += (tilt.ty - tilt.y) * 0.12; }
                if (!hov) tilt.base = null;                                    // re-level the next time the dust appears
                for (const p of dots) {
                    const tgt = !hov ? 1 : tc < 4.5 ? 1 - ease((tc - 0.3 - p.d * 1.2) / 2.2) : ease((tc - 4.5 - p.g * 1.2) / 2.4);
                    p.a += (tgt - p.a) * (1 - Math.exp(-dt / (hov ? 0.05 : 0.3)));   // frame-rate independent; leaving: dots glide home
                    sumA += p.a;
                    if (tilt.on && hov) { const f = (1 - p.a) * 3.6 * (0.55 + p.dr); p.vx += tilt.x * f; p.vy += tilt.y * f; }
                    p.vx = (p.vx - p.ox * 0.04) * 0.9; p.vy = (p.vy - p.oy * 0.04) * 0.9; p.ox += p.vx; p.oy += p.vy;
                    if (Math.abs(p.ox) + Math.abs(p.oy) > 1) moving = true;
                    if (photoA >= 1) continue;
                    const fl = (1 - p.a) * (1 - p.a);
                    let x = p.x + p.ox + fl * W * (0.35 * p.dr + 0.06 * Math.sin(t * 0.7 + p.ph + p.y * 0.03));
                    let y = p.y + p.oy - fl * W * (0.22 * p.dr + 0.05 * Math.cos(t * 0.6 + p.ph + p.x * 0.025));
                    // the cursor is a soft lens: dots near it ease outwards a little and swell, with a smooth falloff (no ring, no hole)
                    let lens = 0;
                    if (mouse.in) { const dx = x - mouse.x, dy = y - mouse.y, d2 = dx * dx + dy * dy; lens = Math.exp(-d2 / LENS2); if (lens > 0.01) { const k2 = 10 * lens / (Math.sqrt(d2) + 6); x += dx * k2; y += dy * k2; } }
                    // grey -> colour following the scroll fade, then a little richer and theme-balanced
                    const s2 = colour * sat, c = v => clamp((p.L + (v - p.L) * s2) * k / 255) * 255;
                    let R = c(p.R), G = c(p.G), B = c(p.B);
                    if (!dark) { const mx = Math.max(R, G, B); if (mx > 226) { const f = 226 / mx; R *= f; G *= f; B *= f; } }   // light mode: no dot brighter than the off-white page (no "glowing" specks)
                    const al = Math.min(1, (dark ? 0.3 : 0.42) + (dark ? 0.7 : 0.58) * p.a + 0.15 * lens);
                    ctx.fillStyle = `rgba(${R | 0},${G | 0},${B | 0},${al})`;
                    const r = (dark ? 1.3 : 1.55) + (dark ? 0.6 : 0.75) * p.w;
                    if (p.big) { ctx.beginPath(); ctx.arc(x, y, (r * 0.72 + 0.3) * (1 + 0.35 * lens), 0, 6.2832); ctx.fill(); }   // accent dots: round and a size up
                    else if (lens > 0.05) { ctx.beginPath(); ctx.arc(x, y, r * 0.58 * (1 + 0.4 * lens), 0, 6.2832); ctx.fill(); }
                    else ctx.fillRect(x - r / 2, y - r / 2, r, r);
                }
                // photo fades out at once on approach, and back in only once the dots are home
                // the photo comes back *while* the dots arrive (no wait-then-pop): it follows how assembled they are
                const avg = sumA / dots.length, want = hov ? 0 : ease(clamp((avg - 0.62) / 0.36));
                photoA = want < photoA ? Math.max(want, photoA - dt / 0.35) : want;
                if (!hov && avg > 0.995) photoA = 1;
                photo.style.opacity = photoA.toFixed(3);
                if (needsAsk && !tilt.on && !tilt.denied && !tilt.asking && !pillMsgT) pill.hidden = !(touchOn && hov && photoA < 0.05);
                cv.style.opacity = (1 - photoA * photoA).toFixed(3);       // dots melt away under the returning photo
                raf = (hov || photoA < 1) ? requestAnimationFrame(frame) : 0;
                if (!raf) last = 0;
            };
            const wake = () => { if (!raf) raf = requestAnimationFrame(frame); };

            let px = -1e4, py = -1e4, touchOn = false;
            const check = () => {
                if (touchOn) return;                                           // touch mode: only taps decide
                const r = zoom.getBoundingClientRect();
                const dx = Math.max(r.left - px, 0, px - r.right), dy = Math.max(r.top - py, 0, py - r.bottom);
                const was = near; near = Math.hypot(dx, dy) < NEAR;
                mouse.x = px - r.left; mouse.y = py - r.top; mouse.in = !dx && !dy;
                if (near || was) wake();
            };
            addEventListener('pointermove', e => { if (e.pointerType === 'touch' || reduce) return; touchOn = false; px = e.clientX; py = e.clientY; check(); }, { passive: true });
            addEventListener('scroll', check, { passive: true });          // the photo moves under a still mouse
            document.addEventListener('pointerleave', e => { if (e.pointerType === 'touch') return; px = py = -1e4; check(); });
            // phones: tap the photo to start the dust, tap again (or anywhere else) to settle it back
            addEventListener('pointerdown', e => {
                if (e.pointerType !== 'touch' && !reduce) return;
                if (e.target.closest && e.target.closest('.tilt-pill')) return;
                const on = fig.contains(e.target) ? !near : false;
                if (on === near) return;
                touchOn = on; near = on; mouse.in = false; wake();
            }, { passive: true });
            new IntersectionObserver(es => { if (touchOn && !es[0].isIntersecting) { touchOn = near = false; wake(); } }).observe(zoom);
            // phones / tablets have no hover: show it once by itself when the photo is well on screen (dissolve, then gather back)
            if (!reduce && matchMedia('(hover: none)').matches) {
                const once = new IntersectionObserver(es => {
                    if (es[0].intersectionRatio < 0.7) return;
                    once.disconnect();
                    setTimeout(() => {
                        if (near) return;                                      // the visitor already tapped
                        touchOn = near = true; mouse.in = false; wake(); enableTilt(false);
                        setTimeout(() => { if (touchOn) { touchOn = near = false; wake(); } }, 3600);
                    }, 600);
                }, { threshold: [0.7] });
                once.observe(zoom);
            }
            let rw = 0; new ResizeObserver(() => { const w = zoom.getBoundingClientRect().width; if (w && Math.abs(w - rw) > 1) { rw = w; build(); } }).observe(zoom);
            build();
        }).catch(() => {});
    }

    const go = () => { const fig = document.getElementById('about-photo'); if (fig && fig.querySelector('img')) start(fig); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
