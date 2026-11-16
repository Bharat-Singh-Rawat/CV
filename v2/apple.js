/* =====================================================================
   More Apple-inspired features:
   1. Dynamic Island: while music plays and the player is tucked away, a small black pill at the
      top shows the artwork and a live waveform; hover or tap expands it into controls.
   2. Spotlight search (⌘K, Ctrl+K or /): jump to any section, role, project, paper, video,
      lab photo or song as you type.
   3. Photos-style viewer for the Lab gallery: click a photo and it zooms to full screen;
      arrows / swipe to move between photos, swipe down or Esc to close, double-click to zoom.
   ===================================================================== */
(function () {
    const T = window.T || (s => s);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const ICON = {
        play: '<svg viewBox="0 0 24 24"><path d="M7 4.6v14.8a1 1 0 0 0 1.5.86l12.3-7.4a1 1 0 0 0 0-1.72L8.5 3.74A1 1 0 0 0 7 4.6z"/></svg>',
        pause: '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4.2" height="16" rx="1.2"/><rect x="13.8" y="4" width="4.2" height="16" rx="1.2"/></svg>',
        prev: '<svg viewBox="0 0 24 24"><path d="M11.5 12 21 18V6zM2.5 12 12 18V6z"/></svg>',
        next: '<svg viewBox="0 0 24 24"><path d="M12.5 12 3 18V6zM21.5 12 12 18V6z"/></svg>',
        search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>'
    };

    // =====================================================================
    // 1. Dynamic Island
    // =====================================================================
    const isl = document.createElement('div');
    isl.className = 'island'; isl.id = 'island'; isl.setAttribute('aria-label', T('Now playing'));
    isl.innerHTML = `
        <button type="button" class="isl-art" id="isl-art" aria-label="${T('Open player')}"></button>
        <div class="isl-info"><span class="isl-title" id="isl-title"></span><span class="isl-artist" id="isl-artist"></span></div>
        <div class="isl-ctrls">
            <button type="button" id="isl-prev" aria-label="Previous">${ICON.prev}</button>
            <button type="button" id="isl-play" aria-label="Play/Pause">${ICON.pause}</button>
            <button type="button" id="isl-next" aria-label="Next">${ICON.next}</button>
        </div>
        <span class="isl-wave" aria-hidden="true"><i></i><i></i><i></i><i></i></span>`;
    document.body.appendChild(isl);
    const art = t => t && t.img ? `url('${t.img}') center / cover` : 'linear-gradient(135deg, #6e6e73, #2c2c2e)';
    let islShown = false, playing = false, waveRaf = 0;
    function setIsland(d) {
        const t = d.track; playing = d.playing;
        const show = !!t && d.playing && d.collapsed;
        // stays up a few seconds after a pause, so a paused song can be resumed from the island
        if (show) { clearTimeout(isl._hide); isl.classList.add('show'); islShown = true; }
        else if (islShown && t && d.collapsed && !d.playing) { clearTimeout(isl._hide); isl._hide = setTimeout(() => { isl.classList.remove('show', 'open'); islShown = false; }, 6000); }
        else { isl.classList.remove('show', 'open'); islShown = false; }
        if (t) {
            isl.querySelector('#isl-art').style.background = art(t);
            isl.querySelector('#isl-title').textContent = t.title;
            isl.querySelector('#isl-artist').textContent = t.artist || '';
        }
        isl.querySelector('#isl-play').innerHTML = playing ? ICON.pause : ICON.play;
        isl.classList.toggle('playing', playing);
        if (playing && islShown) startWave(); else stopWave();
    }
    const bars = [...isl.querySelectorAll('.isl-wave i')];
    function startWave() {                                    // follows the real music on desktop (see music.js)
        if (waveRaf || reduce) return;
        const loop = () => {
            waveRaf = requestAnimationFrame(loop);
            const m = window.cvMusic; if (!m || !m.beatLive()) { isl.classList.add('wave-css'); return; }
            isl.classList.remove('wave-css');
            const L = m.levels, v = [L.b1, (L.b1 + L.b2) / 2 + L.beat * 0.2, L.b2, L.b3];
            bars.forEach((b, i) => { b.style.transform = `scaleY(${Math.max(0.2, Math.min(1, v[i])).toFixed(3)})`; });
        };
        loop();
    }
    function stopWave() { cancelAnimationFrame(waveRaf); waveRaf = 0; bars.forEach(b => { b.style.transform = ''; }); }
    window.addEventListener('cvmusic', e => setIsland(e.detail));
    // expand: hover on desktop, tap on phones
    if (fine) { isl.addEventListener('mouseenter', () => isl.classList.add('open')); isl.addEventListener('mouseleave', () => isl.classList.remove('open')); }
    isl.addEventListener('click', e => {
        if (e.target.closest('.isl-ctrls')) return;
        if (!isl.classList.contains('open')) { isl.classList.add('open'); return; }
        if (e.target.closest('#isl-art')) { window.cvMusic?.open(); isl.classList.remove('open'); }
    });
    document.addEventListener('click', e => { if (!isl.contains(e.target)) isl.classList.remove('open'); });
    isl.querySelector('#isl-play').addEventListener('click', () => window.cvMusic?.toggle());
    isl.querySelector('#isl-next').addEventListener('click', () => window.cvMusic?.next());
    isl.querySelector('#isl-prev').addEventListener('click', () => window.cvMusic?.prev());

    // =====================================================================
    // 3. Photos-style viewer (defined before search, which can open it)
    // =====================================================================
    const tiles = [...document.querySelectorAll('#gallery .tile')];
    const pv = document.createElement('div');
    pv.className = 'pview'; pv.hidden = true;
    pv.setAttribute('role', 'dialog'); pv.setAttribute('aria-modal', 'true'); pv.setAttribute('aria-label', T('Photo viewer'));
    pv.innerHTML = `
        <div class="pv-bg"></div>
        <figure class="pv-fig"><img class="pv-img" alt=""><figcaption class="pv-cap"><h3></h3><p></p></figcaption></figure>
        <button type="button" class="pv-btn pv-close" aria-label="${T('Close')}">✕</button>
        <button type="button" class="pv-btn pv-prev" aria-label="${T('Previous photo')}">‹</button>
        <button type="button" class="pv-btn pv-next" aria-label="${T('Next photo')}">›</button>
        <span class="pv-count"></span>`;
    document.body.appendChild(pv);
    const pImg = pv.querySelector('.pv-img'), pFig = pv.querySelector('.pv-fig');
    let pIdx = 0, zoom = 1, panX = 0, panY = 0, pvOpen = false, lastFocusPV = null;
    // the viewer shows a list of { src, title, text, el }: the lab gallery by default, or photos handed in by other parts (globe)
    const galleryItems = tiles.map(t => ({ el: t, img: t.querySelector('img'), title: t.querySelector('h3')?.textContent || '', text: t.querySelector('p')?.textContent || '' }));
    let items = galleryItems;
    function fill(i) {
        pIdx = (i + items.length) % items.length;
        const it = items[pIdx];
        pImg.src = it.img ? (it.img.currentSrc || it.img.src) : it.src; pImg.alt = it.img?.alt || it.title || '';
        pv.querySelector('.pv-cap h3').textContent = it.title || '';
        pv.querySelector('.pv-cap p').textContent = it.text || '';
        pv.querySelector('.pv-count').textContent = items.length > 1 ? `${pIdx + 1} / ${items.length}` : '';
        pv.classList.toggle('single', items.length < 2);
        setZoom(1);
    }
    function setZoom(z, cx = 0, cy = 0) { zoom = z; panX = cx; panY = cy; pImg.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`; pv.classList.toggle('zoomed', zoom > 1); }
    function openPhoto(i, list) {
        items = list && list.length ? list : galleryItems;
        if (!items.length) return;
        lastFocusPV = document.activeElement;
        fill(i); pv.hidden = false; pvOpen = true;
        document.documentElement.classList.add('pv-open');
        // zoom out of the tile: start the picture where the tile is, then let it grow to full screen
        const from = (items[pIdx].el || pFig).getBoundingClientRect();
        pv.classList.remove('in');
        requestAnimationFrame(() => {
            const to = pFig.getBoundingClientRect();
            if (!reduce && to.width && from.width) {
                pFig.style.transition = 'none';
                pFig.style.transform = `translate(${from.left + from.width / 2 - (to.left + to.width / 2)}px, ${from.top + from.height / 2 - (to.top + to.height / 2)}px) scale(${Math.max(0.2, from.width / to.width)})`;
                pFig.getBoundingClientRect();
                pFig.style.transition = ''; pFig.style.transform = '';
            }
            pv.classList.add('in');
            pv.querySelector('.pv-close').focus();
        });
    }
    function closePhoto() {
        if (!pvOpen) return;
        pvOpen = false; pv.classList.remove('in');
        document.documentElement.classList.remove('pv-open');
        setTimeout(() => { pv.hidden = true; pFig.style.transform = ''; }, 380);
        lastFocusPV?.focus?.();
    }
    tiles.forEach((t, i) => {
        t.setAttribute('tabindex', '0'); t.setAttribute('role', 'button');
        t.setAttribute('aria-label', `${T('Open photo')}: ${t.querySelector('h3')?.textContent || ''}`);
        t.addEventListener('click', () => openPhoto(i));
        t.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPhoto(i); } });
    });
    window.cvPhotos = { open: (list, i = 0) => openPhoto(i, list) };   // used by the career globe
    pv.querySelector('.pv-close').addEventListener('click', closePhoto);
    pv.querySelector('.pv-bg').addEventListener('click', closePhoto);
    pv.querySelector('.pv-prev').addEventListener('click', () => fill(pIdx - 1));
    pv.querySelector('.pv-next').addEventListener('click', () => fill(pIdx + 1));
    pImg.addEventListener('dblclick', e => {
        if (zoom > 1) { setZoom(1); return; }
        const r = pImg.getBoundingClientRect();
        setZoom(2.2, (r.left + r.width / 2 - e.clientX) * 1.2, (r.top + r.height / 2 - e.clientY) * 1.2);
    });
    // drag: pan when zoomed; otherwise swipe left/right for the next photo, swipe down to close
    let drag = null;
    pFig.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, px: panX, py: panY, id: e.pointerId }; pFig.setPointerCapture(e.pointerId); });
    pFig.addEventListener('pointermove', e => {
        if (!drag) return;
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (zoom > 1) { setZoom(zoom, drag.px + dx, drag.py + dy); return; }
        pFig.style.transition = 'none';
        pFig.style.transform = Math.abs(dy) > Math.abs(dx) && dy > 0 ? `translateY(${dy}px) scale(${1 - Math.min(0.25, dy / 1200)})` : `translateX(${dx}px)`;
        pv.querySelector('.pv-bg').style.opacity = Math.abs(dy) > Math.abs(dx) && dy > 0 ? String(1 - Math.min(0.6, dy / 500)) : '';
    });
    const endDrag = e => {
        if (!drag) return;
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag = null;
        pFig.style.transition = ''; pFig.style.transform = ''; pv.querySelector('.pv-bg').style.opacity = '';
        if (zoom > 1) return;
        if (dy > 110 && Math.abs(dy) > Math.abs(dx)) closePhoto();
        else if (dx < -60) fill(pIdx + 1);
        else if (dx > 60) fill(pIdx - 1);
    };
    pFig.addEventListener('pointerup', endDrag); pFig.addEventListener('pointercancel', endDrag);
    window.addEventListener('keydown', e => {
        if (!pvOpen) return;
        if (e.key === 'Escape') { e.stopPropagation(); closePhoto(); }
        if (e.key === 'ArrowRight') fill(pIdx + 1);
        if (e.key === 'ArrowLeft') fill(pIdx - 1);
    }, true);

    // =====================================================================
    // 2. Spotlight search
    // =====================================================================
    const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
    const clean = el => (el ? el.textContent : '').replace(/\s+/g, ' ').trim();
    function goTo(el) {
        if (!el) return;
        el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
        setTimeout(() => { el.classList.remove('sp-flash'); void el.offsetWidth; el.classList.add('sp-flash'); }, reduce ? 0 : 650);
    }
    function buildIndex() {
        const items = [];
        const add = (kind, title, sub, run, extra = '') => title && items.push({ kind, title, sub: sub || '', run, key: norm(`${title} ${sub} ${extra}`) });
        document.querySelectorAll('#ln-nav a[href^="#"]:not(.ln-mobile)').forEach(a => add('section', clean(a), '', () => goTo(document.querySelector(a.getAttribute('href')))));
        document.querySelectorAll('#beamline .station').forEach(s => add('career', clean(s.querySelector('h3')), clean(s.querySelector('.org, .station-org, h4')) || clean(s.querySelector('.station-meta')), () => goTo(s), clean(s)));
        document.querySelectorAll('#projects .project').forEach(p => add('project', clean(p.querySelector('h3')), clean(p.querySelector('.tag')), () => goTo(p), clean(p.querySelector('p'))));
        document.querySelectorAll('#pubs .pub').forEach(p => add('paper', clean(p.querySelector('.title')), clean(p.querySelector('.venue')), () => goTo(p), clean(p.querySelector('.authors'))));
        document.querySelectorAll('.vcard').forEach(v => add('video', clean(v.querySelector('h3')), clean(v.querySelector('.kind')), () => v.click()));
        tiles.forEach((t, i) => add('photo', clean(t.querySelector('h3')), T('Lab'), () => openPhoto(i), clean(t.querySelector('p'))));
        document.querySelectorAll('.offer').forEach(o => add('offer', clean(o.querySelector('h3')), T('Offer'), () => goTo(o)));
        document.querySelectorAll('#rack .module').forEach(m => m.querySelectorAll('.items span').forEach(sp => add('skill', clean(sp), clean(m.querySelector('.label')), () => goTo(m))));
        (window.cvMusic?.tracks || []).forEach((t, i) => add('song', t.title, t.artist, () => { window.cvMusic.playIndex(i); }));
        const mail = document.querySelector('.contact-mail');
        if (mail) add('action', T('Email me'), mail.textContent, () => { location.href = mail.href; });
        add('action', T('Download CV'), 'PDF', () => window.open('/CV/assets/cv/Bharat_Rawat_CV.pdf', '_blank', 'noopener'));
        add('action', T('Plain CV'), '', () => window.open('/CV/plain.html', '_blank', 'noopener'));
        const vc = document.querySelector('.link-btn'); if (vc) add('action', T('Add to contacts'), 'vCard', () => vc.click());
        if (window.cvRetro) add('action', 'Bio Menace', T('Retro corner.'), () => window.cvRetro.open(), 'game play dos retro apogee');
        add('action', T('The library.'), T('Step inside'), () => window.open('/CV/library/', '_blank', 'noopener'), 'library books shelf reading pdf');
        if (window.cvTheme) {
            add('action', T('Dark mode'), T('Appearance'), () => window.cvTheme.set('dark'), 'theme night black');
            add('action', T('Light mode'), T('Appearance'), () => window.cvTheme.set('light'), 'theme day white');
            add('action', T('Automatic appearance'), T('Appearance'), () => window.cvTheme.set('auto'), 'theme system auto');
        }
        return items;
    }
    const KIND = { section: T('Sections'), career: T('Experience'), project: T('Research'), paper: T('Publications'), video: T('Videos'), photo: T('Lab'), offer: T('Offer'), skill: T('Skills'), song: T('Songs'), action: T('Actions') };
    const ORDER = ['section', 'action', 'career', 'project', 'paper', 'video', 'photo', 'offer', 'skill', 'song'];
    const GLYPH = { section: '§', career: '◆', project: '⚛', paper: '¶', video: '▶', photo: '▣', offer: '✦', skill: '•', song: '♪', action: '→' };

    const sp = document.createElement('div');
    sp.className = 'spot'; sp.hidden = true;
    sp.setAttribute('role', 'dialog'); sp.setAttribute('aria-modal', 'true'); sp.setAttribute('aria-label', T('Search'));
    sp.innerHTML = `
        <div class="spot-panel">
            <label class="spot-field">${ICON.search}<input id="spot-in" type="search" autocomplete="off" spellcheck="false"
                placeholder="${T('Search sections, papers, videos, songs…')}" aria-controls="spot-list" aria-autocomplete="list"></label>
            <ul class="spot-list" id="spot-list" role="listbox"></ul>
            <p class="spot-hint"><kbd>↑</kbd><kbd>↓</kbd> ${T('to move')} · <kbd>↵</kbd> ${T('to open')} · <kbd>esc</kbd> ${T('to close')}</p>
        </div>`;
    document.body.appendChild(sp);
    const spIn = sp.querySelector('#spot-in'), spList = sp.querySelector('#spot-list');
    let index = [], results = [], sel = 0, spOpen = false, lastFocusSP = null;
    function search(q) {
        const n = norm(q);
        if (!n) {                                         // empty: sections and quick actions
            results = index.filter(r => r.kind === 'section' || r.kind === 'action');
        } else {
            const words = n.split(' ');
            results = index.map(r => {
                // word endings vary (Фарадей / Фарадея, cup / cups), so long words also match on their stem
                const hit = w => r.key.includes(w) || (w.length > 4 && r.key.includes(w.slice(0, w.length - 2)));
                if (!words.every(hit)) return null;
                const t = norm(r.title);
                const stem = w => (w.length > 4 ? w.slice(0, w.length - 2) : w);
                const tw = t.split(' ');
                const score = (t.startsWith(n) ? 100 : 0) + (t.includes(n) ? 50 : 0)
                    + words.filter(w => t.includes(stem(w))).length * 40                    // the title itself mentions it
                    + words.filter(w => tw.some(x => x.startsWith(stem(w)))).length * 10 - t.length / 100;
                return { ...r, score };
            }).filter(Boolean).sort((a, b) => b.score - a.score || ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind)).slice(0, 40);
            // keep groups together, best group first
            const firstPos = {}; results.forEach((r, i) => { if (!(r.kind in firstPos)) firstPos[r.kind] = i; });
            results.sort((a, b) => firstPos[a.kind] - firstPos[b.kind]);
        }
        sel = 0; render();
    }
    function render() {
        if (!results.length) { spList.innerHTML = `<li class="spot-empty">${T('No results')}</li>`; return; }
        let html = '', last = '';
        results.forEach((r, i) => {
            if (r.kind !== last) { html += `<li class="spot-group" role="presentation">${esc(KIND[r.kind])}</li>`; last = r.kind; }
            html += `<li role="option" id="sp-${i}" data-i="${i}" class="spot-item${i === sel ? ' sel' : ''}" aria-selected="${i === sel}">
                <span class="spot-glyph" aria-hidden="true">${GLYPH[r.kind]}</span>
                <span class="spot-text"><b>${esc(r.title)}</b>${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</span></li>`;
        });
        spList.innerHTML = html;
        spIn.setAttribute('aria-activedescendant', `sp-${sel}`);
        spList.querySelector('.sel')?.scrollIntoView({ block: 'nearest' });
    }
    function openSpot() {
        if (spOpen) return;
        lastFocusSP = document.activeElement;
        index = buildIndex();
        sp.hidden = false; spOpen = true; requestAnimationFrame(() => sp.classList.add('in'));
        spIn.value = ''; search(''); setTimeout(() => spIn.focus(), 30);
    }
    function closeSpot() { if (!spOpen) return; spOpen = false; sp.classList.remove('in'); setTimeout(() => { sp.hidden = true; }, 250); }
    function choose(i) { const r = results[i]; if (!r) return; closeSpot(); setTimeout(() => r.run(), 120); }
    spIn.addEventListener('input', () => search(spIn.value));
    spIn.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(results.length - 1, sel + 1); render(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); render(); }
        else if (e.key === 'Enter') { e.preventDefault(); choose(sel); }
        else if (e.key === 'Escape') { e.preventDefault(); closeSpot(); lastFocusSP?.focus?.(); }
    });
    spList.addEventListener('click', e => { const li = e.target.closest('.spot-item'); if (li) choose(+li.dataset.i); });
    spList.addEventListener('mousemove', e => { const li = e.target.closest('.spot-item'); if (li && +li.dataset.i !== sel) { sel = +li.dataset.i; spList.querySelectorAll('.spot-item').forEach(x => x.classList.toggle('sel', +x.dataset.i === sel)); } });
    sp.addEventListener('click', e => { if (e.target === sp) closeSpot(); });
    window.addEventListener('keydown', e => {
        const typing = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable);
        if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); spOpen ? closeSpot() : openSpot(); return; }
        if (e.key === '/' && !typing && !spOpen && !document.querySelector('.game-ov.open') && !pvOpen) { e.preventDefault(); openSpot(); }
    });
    // a search button in the top bar
    const cta = document.getElementById('ln-cta');
    if (cta) {
        const b = document.createElement('button');
        b.type = 'button'; b.id = 'spot-btn'; b.className = 'spot-btn';
        b.setAttribute('aria-label', T('Search')); b.title = `${T('Search')} (${/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+'}K)`;
        b.innerHTML = ICON.search;
        b.addEventListener('click', openSpot);
        const lang = document.getElementById('lang-pick');
        (lang || cta).parentNode.insertBefore(b, lang || cta);
    }
    window.cvSpot = { open: openSpot };
})();
