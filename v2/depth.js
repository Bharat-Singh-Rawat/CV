/* Depth on the CV page (all off with Reduce Motion):
   1. hero layers: the background glow, the magnetic bottle and the name / pitch move at different speeds while scrolling
   3. research-card photos sit a little larger than their frames and slide inside them while the card scrolls past
   4. research cards tilt towards the cursor with a soft light reflection (mouse only)
   7. a faint background layer (soft light) in each section moves slower than the content
   Phones: only the hero layers (photo and background parallax off: scroll-linked motion can shimmer on iOS). */
(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const phone = matchMedia('(max-width: 600px)').matches || matchMedia('(hover: none)').matches;
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const root = document.documentElement;
    root.classList.add('depth');
    if (!phone) root.classList.add('depth-full');

    let H = innerHeight;
    addEventListener('resize', () => { H = innerHeight; queue(); }, { passive: true });

    // ---------- 1 + 3 + 7: scroll-linked layers, one rAF per scroll ----------
    const hero = document.querySelector('.hero'), field = document.getElementById('field');
    const glow = document.createElement('div'); glow.className = 'hero-glow'; glow.setAttribute('aria-hidden', 'true');
    if (hero) hero.insertBefore(glow, hero.firstChild);
    const name = document.getElementById('hero-name'), pitch = document.getElementById('hero-pitch'), ctas = document.getElementById('hero-ctas');
    let sections = [], frames = [];
    const collect = () => {
        sections = phone ? [] : [...document.querySelectorAll('.section:not(.contact)')];
        frames = phone ? [] : [...document.querySelectorAll('.project:not(.wide) .zoom')];
    };
    let raf = 0;
    const queue = () => { if (!raf) raf = requestAnimationFrame(update); };
    function update() {
        raf = 0;
        const y = scrollY;
        if (hero && y < H * 1.2) {             // hero: far glow slowest, bottle next, text spreads a little
            glow.style.transform = `translate3d(0, ${(y * 0.55).toFixed(1)}px, 0)`;
            if (field) field.style.transform = `translate3d(0, ${(y * 0.32).toFixed(1)}px, 0)`;
            if (name) name.style.transform = `translate3d(0, ${(-y * 0.06).toFixed(1)}px, 0)`;
            if (pitch) pitch.style.transform = `translate3d(0, ${(y * 0.03).toFixed(1)}px, 0)`;
            if (ctas) ctas.style.transform = `translate3d(0, ${(y * 0.07).toFixed(1)}px, 0)`;
        }
        for (const s of sections) {            // background light: lags behind the content
            const r = s.getBoundingClientRect();
            if (r.bottom < -200 || r.top > H + 200) continue;
            s.style.setProperty('--bgy', ((r.top + r.height / 2 - H / 2) * -0.22).toFixed(1) + 'px');
        }
        for (const f of frames) {              // photos slide inside their frames (±6% of the frame height)
            const r = f.getBoundingClientRect();
            if (r.bottom < 0 || r.top > H) continue;
            const k = Math.max(-1, Math.min(1, (r.top + r.height / 2 - H / 2) / (H / 2 + r.height / 2)));
            f.style.setProperty('--py', (k * r.height * 0.06).toFixed(1) + 'px');
        }
    }
    addEventListener('scroll', queue, { passive: true });

    // ---------- 4: research cards tilt towards the cursor ----------
    const tilt = card => {
        if (card.dataset.tilt) return; card.dataset.tilt = '1';
        let r = null, f = 0;
        card.addEventListener('pointerenter', e => { if (e.pointerType !== 'mouse') return; r = card.getBoundingClientRect(); card.classList.add('tilting'); });
        card.addEventListener('pointermove', e => {
            if (e.pointerType !== 'mouse' || !r) return;
            const u = (e.clientX - r.left) / r.width, v = (e.clientY - r.top) / r.height;
            cancelAnimationFrame(f);
            f = requestAnimationFrame(() => {
                card.style.transform = `perspective(1100px) rotateX(${((0.5 - v) * 5).toFixed(2)}deg) rotateY(${((u - 0.5) * 6).toFixed(2)}deg) translateY(-4px)`;
                card.style.setProperty('--gx', (u * 100).toFixed(1) + '%'); card.style.setProperty('--gy', (v * 100).toFixed(1) + '%');
            });
        });
        card.addEventListener('pointerleave', () => { cancelAnimationFrame(f); r = null; card.classList.remove('tilting'); card.style.transform = ''; });
    };

    const init = () => { collect(); if (fine) document.querySelectorAll('.project').forEach(tilt); queue(); };
    // the cards are rendered by v2.js (and again on a language switch): pick them up when they appear
    new MutationObserver(() => init()).observe(document.getElementById('projects') || document.body, { childList: true });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
    addEventListener('load', init);
})();
