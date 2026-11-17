/* =====================================================================
   Living research cards.
   IonSource.mp4 holds four CST simulations in a grid: ion source (top-left), Faraday cup (top-right),
   Penning trap (bottom-left), rotating wall (bottom-right). PY-BEMCS.mp4 is a PY-BEMCS dashboard
   recording; only its particle-trajectory plot (top-left) is shown.
   Each card with data-clip draws its panel of a video onto a canvas over its photo. Each video is
   downloaded once, and only after the first hover (desktop) or scroll into view (phones).
   Desktop: plays while hovered. Touch: plays while the card is mostly on screen.
   A card with two clips ("penning,wall") alternates each loop.
   If the phone refuses to autoplay (iPhone Low Power Mode) or the visitor asked for reduced motion /
   less data, a small play button appears instead and one tap starts the clip.
   ===================================================================== */
(function () {
    const CST = '/CV/assets/video/IonSource.mp4', BEMCS = '/CV/assets/video/PY-BEMCS.mp4';
    // panel rectangles in video pixels (CST video 1920×1080, PY-BEMCS video 854×529).
    // fit: 'cover' crops, 'contain' shows all and extends the panel's own background by stretching
    // its edge pixels. fx/fy = focus point for cover.
    const R = {
        ion:     { src: CST,   x: 72,   y: 0,   w: 1181, h: 600, fit: 'cover', fx: 0.04, fy: 0.5 },
        faraday: { src: CST,   x: 1270, y: 20,  w: 635,  h: 600, fit: 'contain' },
        penning: { src: CST,   x: 0,    y: 640, w: 1253, h: 436, fit: 'contain' },
        wall:    { src: CST,   x: 1280, y: 628, w: 610,  h: 440, fit: 'contain' },
        bemcs:   { src: BEMCS, x: 50,   y: 27,  w: 502,  h: 235, fit: 'cover', fx: 0.15, fy: 0.5 }
    };
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = navigator.connection && navigator.connection.saveData;
    const manual = reduce || saveData;                 // never start on its own: tap the play button
    const cards = [...document.querySelectorAll('.project[data-clip]')];
    if (!cards.length) return;
    const T = window.T || (s => s);
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>';
    const PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>';

    // a round glass play / pause button on the card's picture
    function playButton(zoom, onTap) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'clip-play'; b.hidden = true;
        b.setAttribute('aria-label', T('Play clip')); b.innerHTML = PLAY;
        b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); onTap(); });
        zoom.appendChild(b);
        b.set = playing => { b.innerHTML = playing ? PAUSE : PLAY; b.setAttribute('aria-label', T(playing ? 'Pause' : 'Play clip')); };
        return b;
    }


    const media = {};                                  // src -> { v, loops, lastT, pauseTimer }
    const active = new Set();
    let raf = 0;
    // phones: never paint video frames while the page is being scrolled (keeps scrolling smooth)
    let scrolling = false, scrollTimer = 0;
    if (!fine) addEventListener('scroll', () => { scrolling = true; clearTimeout(scrollTimer); scrollTimer = setTimeout(() => { scrolling = false; }, 160); }, { passive: true });

    const items = cards.map(card => {
        const zoom = card.querySelector('.zoom');
        if (!zoom) return null;
        const clips = card.dataset.clip.split(',').map(k => R[k.trim()]).filter(Boolean);
        if (!clips.length) return null;
        const cv = document.createElement('canvas');
        cv.className = 'clip'; cv.setAttribute('aria-hidden', 'true');
        const tag = document.createElement('span');
        tag.className = 'clip-tag'; tag.textContent = T('Simulation');
        zoom.append(cv, tag);
        const it = { card, zoom, cv, ctx: cv.getContext('2d'), clips, src: clips[0].src, w: 0, h: 0 };
        it.btn = playButton(zoom, () => tap(it));
        if (manual) it.btn.hidden = false;
        new ResizeObserver(() => size(it)).observe(zoom);
        return it;
    }).filter(Boolean);

    function size(it) {
        const r = it.cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, fine ? 2 : 1.25);   // phones: lighter canvas
        it.w = it.cv.width = Math.max(1, Math.round(r.width * dpr));
        it.h = it.cv.height = Math.max(1, Math.round(r.height * dpr));
    }

    const users = src => [...active].filter(i => i.src === src);

    function ensureVideo(src) {
        if (media[src]) return media[src];
        const v = document.createElement('video');
        Object.assign(v, { muted: true, loop: true, playsInline: true, preload: 'auto', src });
        v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
        v.className = 'clip-src'; v.setAttribute('aria-hidden', 'true');
        return (media[src] = { v, loops: 0, lastT: 0, pauseTimer: 0 });
    }
    // Browsers pause muted videos they consider invisible, so each source video sits inside an
    // active card (behind the photo, fully covered) rather than hidden somewhere off-screen.
    function home(src) {
        const first = users(src)[0], v = media[src].v;
        if (first && v.parentNode !== first.zoom) first.zoom.insertBefore(v, first.zoom.firstChild);
    }

    function paint(it, v, loops) {
        const c = it.ctx, cw = it.w, ch = it.h;
        const r = it.clips[loops % it.clips.length];
        const s = r.fit === 'cover' ? Math.max(cw / r.w, ch / r.h) : Math.min(cw / r.w, ch / r.h);
        const dw = r.w * s, dh = r.h * s;
        const dx = (cw - dw) * (r.fx ?? 0.5), dy = (ch - dh) * (r.fy ?? 0.5);
        if (r.fit === 'contain') {                       // extend the panel's own background to fill the card
            if (dx > 0.5) {
                c.drawImage(v, r.x + 3, r.y, 1, r.h, 0, dy, dx + 1, dh);
                c.drawImage(v, r.x + r.w - 4, r.y, 1, r.h, dx + dw - 1, dy, cw - dx - dw + 1, dh);
            }
            if (dy > 0.5) {
                c.drawImage(v, r.x, r.y + 2, r.w, 1, dx, 0, dw, dy + 1);
                c.drawImage(v, r.x, r.y + r.h - 3, r.w, 1, dx, dy + dh - 1, dw, ch - dy - dh + 1);
            }
        }
        c.drawImage(v, r.x, r.y, r.w, r.h, dx, dy, dw, dh);
    }

    function frame() {
        raf = 0;
        if (!active.size) return;
        for (const src in media) {
            const m = media[src], us = users(src);
            if (!us.length || m.v.readyState < 2) continue;
            const t = m.v.currentTime;
            if (t + 0.5 < m.lastT) m.loops++;            // the video wrapped round
            m.lastT = t;
            if (scrolling) continue;
            if (t === m.paintedT && us.every(it => it.card.classList.contains('clip-on'))) continue;   // no new video frame
            m.paintedT = t;
            for (const it of us) { if (!it.w) size(it); paint(it, m.v, m.loops); it.card.classList.add('clip-on'); }
        }
        raf = requestAnimationFrame(frame);
    }

    function start(it) {
        if (active.has(it)) return;
        const m = ensureVideo(it.src);
        clearTimeout(m.pauseTimer);
        if (!users(it.src).length) { try { m.v.currentTime = 0; } catch (e) { /* not loaded yet */ } m.lastT = 0; }
        active.add(it);
        home(it.src);
        play(it.src);
        it.btn.set(true);
        if (!raf) raf = requestAnimationFrame(frame);
    }
    // the phone may refuse to start a video on its own (iPhone Low Power Mode): offer a play button
    function play(src) {
        const m = media[src], p = m.v.play();
        if (p && p.then) p.then(() => { m.blocked = false; users(src).forEach(it => it.btn.set(true)); }, err => {
            if (!err || err.name !== 'NotAllowedError') return;
            m.blocked = true;
            for (const it of users(src)) { it.btn.hidden = false; it.btn.set(false); }
        });
    }
    // a tap on the play button (a real gesture, so the phone allows it)
    function tap(it) {
        const m = media[it.src];
        if (active.has(it) && m && !m.v.paused) { stop(it); it.wanted = false; return; }
        it.wanted = true;
        if (!active.has(it)) start(it); else play(it.src);
    }
    function stop(it) {
        if (!active.delete(it)) return;
        it.card.classList.remove('clip-on');
        it.btn.set(false);
        const m = media[it.src];
        if (users(it.src).length) home(it.src);
        else m.pauseTimer = setTimeout(() => m.v.pause(), 600);
    }

    if (fine && !manual) {
        for (const it of items) {
            it.card.addEventListener('pointerenter', () => start(it));
            it.card.addEventListener('pointerleave', () => stop(it));
            it.card.addEventListener('focusin', () => start(it));
            it.card.addEventListener('focusout', () => stop(it));
        }
    } else {
        const io = new IntersectionObserver(es => es.forEach(e => {
            const it = items.find(i => i.card === e.target);
            if (e.isIntersecting && e.intersectionRatio >= 0.6) { if (!manual || it.wanted) start(it); }
            else stop(it);
        }), { threshold: [0, 0.6] });
        items.forEach(it => io.observe(it.card));
    }
    document.addEventListener('visibilitychange', () => {
        for (const src in media) {
            const v = media[src].v;
            if (document.hidden) v.pause(); else if (users(src).length) v.play().catch(() => {});
        }
    });
})();
