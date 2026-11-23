/* Image reveal on the research cards: the picture starts as a colour halftone print; when the card scrolls into view
      the dots swell, merge and give way to the photo (once).
   (The lab gallery's focus pull is plain CSS in v2.css: .lab .tile.active img.) */
(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (matchMedia('(max-width: 600px)').matches) return;          // phones: the dot pattern shimmers while scrolling; cards just fade in
    const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
    const ease = x => 1 - Math.pow(1 - clamp(x), 3);
    const dark = () => document.documentElement.dataset.theme === 'dark';
    const ready = img => img.complete && img.naturalWidth ? Promise.resolve() : new Promise(r => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); });

    // sample an <img> as drawn with object-fit: cover into cols x rows cells
    function cells(img, cols, rows) {
        const c = document.createElement('canvas'); c.width = cols; c.height = rows;
        const x = c.getContext('2d', { willReadFrequently: true });
        const s = Math.max(cols / img.naturalWidth, rows / img.naturalHeight), w = img.naturalWidth * s, h = img.naturalHeight * s;
        x.drawImage(img, (cols - w) / 2, (rows - h) / 2, w, h);
        try { return x.getImageData(0, 0, cols, rows).data; } catch { return null; }
    }
    function overlay(host, img) {
        const cv = document.createElement('canvas');
        cv.setAttribute('aria-hidden', 'true');
        cv.className = 'ifx';
        cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;transition:none';
        img.after(cv);
        if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
        return cv;
    }

    // ---------- 1. halftone -> photo on research cards ----------
    function halftone(card) {
        const zoom = card.querySelector('.zoom'), img = zoom && zoom.querySelector('img');
        if (!img) return;
        ready(img).then(() => {
            const r = zoom.getBoundingClientRect(); if (!r.width || !img.naturalWidth) return;
            const W = r.width, H = r.height, dpr = Math.min(2, devicePixelRatio || 1);
            const sp = clamp(W / 70, 4.5, 7), cols = Math.ceil(W / sp) + 1, rows = Math.ceil(H / sp) + 1;
            const d = cells(img, cols, rows); if (!d) return;
            const cv = overlay(zoom, img), ctx = cv.getContext('2d');
            cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
            const paper = getComputedStyle(zoom).backgroundColor;
            const dots = [];
            for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
                const i = (y * cols + x) * 4, R = d[i], G = d[i + 1], B = d[i + 2];
                const L = (0.299 * R + 0.587 * G + 0.114 * B) / 255;
                const ink = dark() ? 0.25 + 0.75 * L : 1 - L * 0.85;       // classic screen: darker = bigger dot (inverted on dark)
                dots.push([(x + (y & 1) * 0.5) * sp, y * sp, Math.sqrt(clamp(ink)), `rgb(${R},${G},${B})`]);
            }
            const cx = W * 0.5, cy = H * 0.5, far = Math.hypot(cx, cy);
            const draw = t => {                                            // t: 0 = print, 1 = fully merged
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H);
                for (const [x, y, k, col] of dots) {
                    const e = ease((t * 1.5) - Math.hypot(x - cx, y - cy) / far * 0.5);   // swell from the centre outwards
                    const rr = sp * (0.5 * k * (1 - e) + 0.78 * e);
                    if (rr < 0.25) continue;
                    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, rr, 0, 6.283); ctx.fill();
                }
            };
            draw(0);
            img.style.opacity = '0';
            let played = false;
            const play = () => {
                if (played) return; played = true;
                const t0 = performance.now() + 250;                         // let the card's own fade-in land first
                const step = now => {
                    const t = (now - t0) / 1000;
                    if (t < 0) return requestAnimationFrame(step);
                    draw(clamp(t / 1.1));
                    const fade = ease((t - 0.8) / 0.6);
                    img.style.opacity = fade.toFixed(3);
                    cv.style.opacity = (1 - fade).toFixed(3);
                    if (fade < 1) requestAnimationFrame(step);
                    else { cv.remove(); img.style.opacity = ''; }
                };
                requestAnimationFrame(step);
            };
            const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); play(); } }, { threshold: 0.45 });
            io.observe(zoom);
        });
    }

    const go = () => {
        document.querySelectorAll('#projects .project').forEach(halftone);
    };
    if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true });
})();
