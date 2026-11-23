/* About photo "gather" effect: the photo stays a normal photo until the cursor comes near,
   then it breaks into coloured dust that drifts off and gathers back; moving away settles it
   into the photo again. Dots follow the same black & white -> colour scroll fade (--colour). */
(() => {
    // Reduce Motion: nothing moves on its own (no hover trigger, no auto-play), but a tap / click still plays it
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const CUTOUT = '/CV/v2/img/profile-cutout.webp';   // profile.webp with the background removed, same framing
    const NEAR = 60;                                    // px around the photo that counts as "near"
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
                dots = [];
                for (let i = 0; i < cols * rows; i++) {
                    if (d[i * 4 + 3] < 128) continue;
                    const R = d[i * 4], G = d[i * 4 + 1], B = d[i * 4 + 2], L = 0.299 * R + 0.587 * G + 0.114 * B;
                    const w = clamp((235 - L) / 200);                      // darker = slightly denser and bigger
                    if (Math.random() > 0.78 + 0.22 * w) continue;
                    const x = ((i % cols) + rnd(0.15, 0.85)) * cw, y = ((i / cols | 0) + rnd(0.15, 0.85)) * ch;
                    dots.push({ R, G, B, L, w, x, y, ph: rnd(0, 6.283), d: x / W * 0.9 + rnd(0, 0.35), dr: rnd(0.25, 0.6), ox: 0, oy: 0, vx: 0, vy: 0, a: 1 });
                }
            };

            const frame = now => {
                const t = now / 1000, dt = Math.min(0.05, last ? t - last : 0.016); last = t;
                if (near && !hov) ht = 0;                                   // each approach starts the cycle fresh
                hov = near; if (hov) ht += dt;
                const tc = ht % 9;                                          // near: dissolve 0.3-4.5 s, gather back 4.5-9 s
                const colour = clamp(parseFloat(fig.style.getPropertyValue('--colour')) || 0);
                const dark = document.documentElement.dataset.theme === 'dark', k = dark ? 1.15 : 0.92, sat = 1.15;
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
                let sumA = 0, moving = false;
                if (tilt.on) { tilt.x += (tilt.tx - tilt.x) * 0.12; tilt.y += (tilt.ty - tilt.y) * 0.12; }
                if (!hov) tilt.base = null;                                    // re-level the next time the dust appears
                for (const p of dots) {
                    const tgt = !hov ? 1 : tc < 4.5 ? 1 - ease((tc - 0.3 - p.d * 1.2) / 2.2) : ease((tc - 4.5 - p.d * 1.2) / 2.4);
                    p.a += (tgt - p.a) * (1 - Math.exp(-dt / (hov ? 0.05 : 0.3)));   // frame-rate independent; leaving: dots glide home
                    sumA += p.a;
                    if (mouse.in) { const dx = p.x + p.ox - mouse.x, dy = p.y + p.oy - mouse.y, d2 = dx * dx + dy * dy; if (d2 < 2500) { const f = 40 / (d2 + 80); p.vx += dx * f; p.vy += dy * f; } }
                    if (tilt.on && hov) { const f = (1 - p.a) * 3.6 * (0.55 + p.dr); p.vx += tilt.x * f; p.vy += tilt.y * f; }
                    p.vx = (p.vx - p.ox * 0.04) * 0.9; p.vy = (p.vy - p.oy * 0.04) * 0.9; p.ox += p.vx; p.oy += p.vy;
                    if (Math.abs(p.ox) + Math.abs(p.oy) > 1) moving = true;
                    if (photoA >= 1) continue;
                    const fl = (1 - p.a) * (1 - p.a);
                    const x = p.x + p.ox + fl * W * (0.35 * p.dr + 0.06 * Math.sin(t * 0.7 + p.ph + p.y * 0.03));
                    const y = p.y + p.oy - fl * W * (0.22 * p.dr + 0.05 * Math.cos(t * 0.6 + p.ph + p.x * 0.025));
                    // grey -> colour following the scroll fade, then a little richer and theme-balanced
                    const s2 = colour * sat, c = v => Math.round(clamp((p.L + (v - p.L) * s2) * k / 255) * 255);
                    ctx.fillStyle = `rgba(${c(p.R)},${c(p.G)},${c(p.B)},${0.3 + 0.7 * p.a})`;
                    const r = 1.3 + 0.6 * p.w; ctx.fillRect(x, y, r, r);
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
