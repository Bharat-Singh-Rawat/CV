/* =====================================================================
   "The Beamline" — v2 CV. All content comes from /Dossier/profile.js.
   ===================================================================== */
(function () {
    const P = window.PROFILE;
    const $ = id => document.getElementById(id);
    if (!P) { document.body.insertAdjacentHTML('afterbegin', '<p style="padding:100px 24px">Profile data failed to load. Please refresh.</p>'); return; }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const strip = html => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent; };
    const titleCase = s => s.toLowerCase().replace(/(^|[\s(\/&-])\S/g, c => c.toUpperCase());
    const yearOf = s => { const m = String(s).match(/\d{4}/); return m ? +m[0] : 0; };
    const links = P.links || [];
    const mail = links.find(l => /^mailto:/.test(l.url));
    const ext = links.filter(l => !/^mailto:/.test(l.url));
    const CV_PDF = '/CV/assets/cv/Bharat_Rawat_CV.pdf';
    const img = (src, alt) => `<img src="${esc(src)}" alt="${esc(alt || '')}" loading="lazy" decoding="async">`;
    const extLinks = () => ext.map(l => `<a class="link" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join('');

    // ---------- hero ----------
    const bare = P.name.replace(/,.*$/, '').trim();
    const words = titleCase(bare).split(/\s+/);
    const degree = (P.name.match(/,\s*(.+)$/) || [])[1] || '';
    $('ln-title').textContent = words.join(' ');

    // section bar: chevron menu on small screens
    const topbarEl = $('topbar'), lnToggle = $('ln-toggle');
    const setMenu = open => { topbarEl.classList.toggle('menu-open', open); lnToggle.setAttribute('aria-expanded', open); };
    lnToggle.addEventListener('click', e => { e.stopPropagation(); setMenu(!topbarEl.classList.contains('menu-open')); });
    $('ln-nav').addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('click', e => { if (!topbarEl.contains(e.target)) setMenu(false); });

    $('hero-eyebrow').textContent = titleCase(P.title);
    $('hero-name').innerHTML = `${esc(words.slice(0, -1).join(' '))}<br><span class="light">${esc(words[words.length - 1])}</span>${degree ? `<sup>${esc(degree)}</sup>` : ''}`;
    $('hero-pitch').innerHTML = P.summary;
    $('hero-ctas').innerHTML =
        (mail ? `<a class="btn" href="${esc(mail.url)}">Get in touch</a>` : '')
        + `<a class="link" href="${CV_PDF}" target="_blank" rel="noopener">Download CV</a>`
        + `<a class="link" href="#research">See my work</a>`;

    // ---------- about ----------
    const about = P.about || {};
    $('about-first').textContent = words[0];
    $('about-body').innerHTML = esc(about.text || strip(P.summary));
    if (about.photo) $('about-photo').innerHTML = `<div class="zoom" style="height:100%"><img src="${esc(about.photo)}" srcset="${esc(about.photo.replace(/\.webp$/, '-sm.webp'))} 540w, ${esc(about.photo)} 900w" sizes="(max-width: 1000px) 90vw, 440px" width="900" height="1200" alt="${esc(about.photoAlt || '')}" decoding="async"></div>`;
    else $('about-photo').remove();
    $('about-links').innerHTML = extLinks();

    // ---------- career beamline (newest first) ----------
    const roles = [
        ...P.experience.map((e, i) => ({ ...e, kind: 'experience', order: i })),
        ...P.education.map((e, i) => ({ ...e, kind: 'education', order: 100 + i }))
    ].sort((a, b) => yearOf(b.dates) - yearOf(a.dates) || a.order - b.order);
    $('beamline').innerHTML = roles.map(r => {
        const now = /present/i.test(r.dates);
        return `
        <li class="station ${r.kind === 'education' ? 'edu' : ''} ${now ? 'now' : ''} reveal">
            <div class="node" aria-hidden="true"><i></i></div>
            <div class="station-body">
                <div class="station-meta">
                    <span class="kind">${r.kind === 'education' ? 'Education' : 'Experience'}</span>
                    <span>${esc(r.dates)}</span>
                    ${now ? '<span class="now-tag">Now</span>' : ''}
                </div>
                <h3>${r.role}</h3>
                <p class="org">${r.org}</p>
                <ul>${r.bullets.map((b, k) => `<li${k >= 2 ? ' class="extra"' : ''}>${b}</li>`).join('')}</ul>
                ${r.bullets.length > 2 ? `<button type="button" class="more-btn" aria-expanded="false">More</button>` : ''}
            </div>
        </li>`;
    }).join('');

    $('beamline').addEventListener('click', e => {
        const b = e.target.closest('.more-btn'); if (!b) return;
        const open = b.closest('.station').classList.toggle('open');
        b.setAttribute('aria-expanded', open); b.textContent = open ? 'Less' : 'More';
    });

    // ---------- research highlights ----------
    $('expertise').innerHTML = P.expertise;
    $('projects').innerHTML = (P.projects || []).map(p => {
        const tag = p.url ? 'a' : 'div';
        const attrs = p.url ? ` href="${esc(p.url)}" target="_blank" rel="noopener"` : '';
        return `
        <${tag} class="project reveal${p.image ? '' : ' text-only'}"${attrs}>
            ${p.image ? `<div class="zoom">${img(p.image, p.name)}</div>` : ''}
            <div class="project-body">
                <span class="tag">${esc(p.tag)}</span>
                <h3>${esc(p.name)}</h3>
                <p>${esc(p.text)}</p>
                ${p.url ? `<span class="go"><span class="link">${/github\.com/.test(p.url) ? 'View code' : 'Open project'}</span></span>` : ''}
            </div>
        </${tag}>`;
    }).join('');

    // ---------- lab gallery: pinned; page scroll slides the photos, the centred one grows ----------
    const lab = $('lab'), track = $('gallery'), bar = $('lab-bar');
    track.innerHTML = (P.gallery || []).map(g => `
        <figure class="tile">
            ${img(g.img, g.title)}
            <figcaption><h3>${esc(g.title)}</h3><p>${esc(g.text)}</p></figcaption>
        </figure>`).join('');
    const tiles = [...track.children];
    let labShift = 0, labX = 0, labTarget = 0, labRunning = false, labLast = 0, labInView = false;
    let geo = { centers: [], widths: [], step: 1 }, bestIdx = -1;
    const touchSmall = window.matchMedia('(max-width: 760px), (hover: none) and (pointer: coarse)').matches;
    const labStatic = reduceMotion || touchSmall || !tiles.length;          // phones/tablets: natural swipe row
    if (!tiles.length) lab.remove();
    else if (labStatic) lab.classList.add('static');
    function layoutLab() {                                                  // all measuring happens here, never per frame
        if (labStatic) return;
        tiles.forEach(t => { t.style.transform = ''; });
        const vw = window.innerWidth, tw = tiles[0].offsetWidth;
        track.style.setProperty('--pad', ((vw - tw) / 2) + 'px');
        geo = {
            centers: tiles.map(t => t.offsetLeft + t.offsetWidth / 2),
            widths: tiles.map(t => t.offsetWidth),
            step: tiles.length > 1 ? tiles[1].offsetLeft - tiles[0].offsetLeft : 1
        };
        labShift = Math.max(0, tiles[tiles.length - 1].offsetLeft - tiles[0].offsetLeft);
        lab.style.height = (labShift * 0.55 + window.innerHeight) + 'px';
        labTop = lab.offsetTop;
        bestIdx = -1; labTarget = labX = targetLab(window.scrollY); paintLab();
    }
    let labTop = 0;
    function targetLab(y) {
        const span = lab.offsetHeight - window.innerHeight;
        const prog = span > 0 ? Math.min(1, Math.max(0, (y - labTop) / span)) : 0;
        return -prog * labShift;
    }
    function paintLab() {                                                   // writes only
        track.style.transform = `translate3d(${labX.toFixed(2)}px, 0, 0)`;
        bar.style.transform = `scaleX(${labShift ? (-labX / labShift).toFixed(4) : 0})`;   // follows the photos, not the scroll
        const mid = window.innerWidth / 2;
        let best = 0, bestD = Infinity;
        for (let k = 0; k < tiles.length; k++) {
            const off = geo.centers[k] + labX - mid;
            const n = Math.min(2.2, Math.abs(off) / geo.step);
            const sc = 1 - 0.38 * Math.min(1, n) - 0.08 * Math.max(0, n - 1);
            const pull = -Math.sign(off) * (1 - sc) * geo.widths[k] * 0.42;
            tiles[k].style.transform = `translate3d(${pull.toFixed(1)}px, 0, 0) scale(${sc.toFixed(4)})`;
            tiles[k].style.opacity = (1 - 0.35 * Math.min(1, n) - 0.25 * Math.max(0, n - 1)).toFixed(3);
            if (Math.abs(off) < bestD) { bestD = Math.abs(off); best = k; }
        }
        if (best !== bestIdx) {                                             // restack only when the centre photo changes
            bestIdx = best;
            tiles.forEach((t, k) => { t.classList.toggle('active', k === best); t.style.zIndex = String(50 - Math.abs(k - best)); });
        }
    }
    function labLoop(now) {                                                 // frame-rate independent glide (same feel at 60 and 120 Hz)
        const dt = Math.min(64, now - (labLast || now)); labLast = now;
        labX += (labTarget - labX) * (1 - Math.exp(-dt / 110));
        paintLab();
        if (Math.abs(labTarget - labX) > 0.3) requestAnimationFrame(labLoop);
        else { labX = labTarget; paintLab(); labRunning = false; labLast = 0; }
    }
    function onLabScroll(y) {
        if (labStatic) return;
        labInView = y + window.innerHeight > labTop && y < labTop + lab.offsetHeight;
        lab.classList.toggle('inview', labInView);
        if (!labInView) return;
        labTarget = targetLab(y);
        if (!labRunning) { labRunning = true; requestAnimationFrame(labLoop); }
    }
    if (!labStatic) {
        window.addEventListener('resize', layoutLab);
        window.addEventListener('load', layoutLab);
        const preload = () => tiles.forEach(t => { const i = t.querySelector('img'); if (i) i.loading = 'eager'; });
        if ('IntersectionObserver' in window) {
            const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { preload(); io.disconnect(); } }, { rootMargin: '150% 0px' });
            io.observe(lab);
        } else { preload(); labInView = true; }
        layoutLab();
    }

    // ---------- videos: hover to preview (muted), click to watch ----------
    const vids = P.videos || [];
    const ytThumb = id => `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
    const ytEmbed = (id, preview) => `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?` + (preview
        ? `autoplay=1&mute=1&controls=0&loop=1&playlist=${encodeURIComponent(id)}&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1`
        : `autoplay=1&playsinline=1&rel=0&modestbranding=1`);
    const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/></svg>';
    const vcard = v => `
        <button type="button" class="vcard reveal" data-id="${esc(v.id)}" aria-label="Play: ${esc(v.title)}">
            <div class="vthumb">${img(ytThumb(v.id), '')}<span class="vplay">${PLAY}</span></div>
            <div class="vmeta"><span class="kind">${esc(v.kind || 'Video')}</span><h3>${esc(v.title)}</h3></div>
        </button>`;
    $('lectures').innerHTML = vids.filter(v => /lecture|talk/i.test(v.kind)).map(vcard).join('');
    $('sims').innerHTML = vids.filter(v => !/lecture|talk/i.test(v.kind)).map(vcard).join('');
    const yt = links.find(l => /youtube\.com/.test(l.url));
    if (yt) $('channel-link').href = yt.url; else $('channel-link').parentElement.remove();
    if (!vids.length) $('videos').remove();
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!canHover && $('videos-sub')) $('videos-sub').textContent = 'Tap any video to watch.';
    document.querySelectorAll('.vcard').forEach(card => {
        let timer = null;
        const stop = () => { clearTimeout(timer); card.classList.remove('playing'); card.querySelector('.vthumb iframe')?.remove(); };
        if (canHover && !reduceMotion) {
            card.addEventListener('mouseenter', () => {
                timer = setTimeout(() => {                                   // short delay so a quick pass doesn't load a player
                    const f = document.createElement('iframe');
                    f.src = ytEmbed(card.dataset.id, true); f.title = 'Preview'; f.allow = 'autoplay; encrypted-media'; f.tabIndex = -1;
                    f.addEventListener('load', () => setTimeout(() => { f.classList.add('on'); card.classList.add('playing'); }, 350));
                    card.querySelector('.vthumb').appendChild(f);
                }, 280);
            });
            card.addEventListener('mouseleave', stop);
        }
        card.addEventListener('click', () => { stop(); openVideo(card.dataset.id); });
    });
    const modal = $('vmodal'), frame = $('vmodal-frame');
    let lastFocus = null;
    function openVideo(id) {
        lastFocus = document.activeElement;
        window.cvMusic?.pause();
        frame.innerHTML = `<iframe src="${ytEmbed(id, false)}" title="Video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
        modal.hidden = false; requestAnimationFrame(() => modal.classList.add('open'));
        $('vmodal-close').focus();
    }
    function closeVideo() {
        modal.classList.remove('open');
        setTimeout(() => { modal.hidden = true; frame.innerHTML = ''; lastFocus?.focus(); }, 520);
    }
    $('vmodal-close').addEventListener('click', closeVideo);
    modal.addEventListener('click', e => { if (e.target === modal) closeVideo(); });
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeVideo(); });

    // ---------- publications, grouped by year ----------
    const pubs = P.publications.map(p => ({ ...p, year: yearOf(p.venue), v: p.venue.replace(/\s*\(\d{4}\)\s*$/, '') }));
    const years = [...new Set(pubs.map(p => p.year))].sort((a, b) => b - a);
    const span = years.length ? `${years[years.length - 1]}–${years[0]}` : '';
    $('pub-sub').textContent = `Journal papers, conference proceedings and my Ph.D. dissertation${span ? `, ${span}` : ''}.`;
    $('pubs').innerHTML = years.map(y => `
        <div class="pub-year reveal">
            <span>${y}</span>
            <div>${pubs.filter(p => p.year === y).map(p => {
                const badges = [
                    p.badge ? `<span class="badge${/cover/i.test(p.badge) ? ' cover' : ''}">${esc(p.badge)}</span>` : '',
                    /Phys\.\s*Rev\.\s*Lett/i.test(p.v) ? '<span class="badge">Featured</span>' : ''
                ].join('');
                const doiUrl = p.doi ? `https://doi.org/${encodeURI(p.doi)}` : (p.url || '');
                const authors = p.authors ? esc(p.authors).replace(/(Rawat,?\s*B\.\s*S\.?)/g, '<b>$1</b>') : '';
                return `
                <div class="pub">
                    <span class="venue">${esc(p.v)}</span>${badges}
                    ${doiUrl ? `<a class="title" href="${doiUrl}" target="_blank" rel="noopener">${p.title}</a>` : `<span class="title">${p.title}</span>`}
                    ${authors ? `<span class="authors">${authors}</span>` : ''}
                    ${p.doi ? `<a class="doi" href="${doiUrl}" target="_blank" rel="noopener">doi:${esc(p.doi)}</a>` : ''}
                    ${p.url ? `<a class="doi" href="${esc(p.url)}" target="_blank" rel="noopener">${/researchgate/i.test(p.url) ? 'ResearchGate' : 'Read online'} ↗</a>` : ''}
                </div>`;
            }).join('')}
            </div>
        </div>`).join('');

    // ---------- talks ----------
    $('talk-list').innerHTML = P.talks.map(t => {
        const m = t.text.match(/^\s*["“](.+?)["”]\s*(.*)$/);
        const title = m ? m[1] : t.text, where = m ? m[2].replace(/\.\s*$/, '') : '';
        return `
        <li class="talk reveal ${/invited/i.test(t.type) ? 'invited' : ''}">
            <span class="kind">${esc(t.type)}</span>
            <h3>${esc(title)}</h3>
            ${where ? `<span class="where">${esc(where)}</span>` : ''}
        </li>`;
    }).join('');

    // ---------- what I offer ----------
    const ICONS = {
        consult: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>',
        mentor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 9 12 4 2 9l10 5 10-5z"/><path d="M6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/></svg>',
        talk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8"/></svg>'
    };
    const iconFor = t => /mentor/i.test(t) ? ICONS.mentor : /talk|outreach/i.test(t) ? ICONS.talk : ICONS.consult;
    $('offers').innerHTML = (P.offer || []).map(o => `
        <div class="offer reveal">
            <div class="icon" aria-hidden="true">${iconFor(o.title)}</div>
            <h3>${esc(o.title)}</h3>
            <p>${esc(o.text)}</p>
        </div>`).join('');
    if (!(P.offer || []).length) $('offer').remove();

    // ---------- skills rack ----------
    const splitItems = text => {                     // split on , or ; but not inside (...)
        const out = []; let depth = 0, cur = '';
        for (const ch of text) {
            if (ch === '(') depth++;
            if (ch === ')') depth = Math.max(0, depth - 1);
            if ((ch === ',' || ch === ';') && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
        }
        out.push(cur);
        return out.map(s => s.trim().replace(/\.$/, '')).filter(Boolean);
    };
    const OWN = '\u0001';    // marks <b>…</b> items (your own tools); entities decoded before splitting
    $('rack').innerHTML = P.skills.map(s => `
        <div class="module reveal">
            <div class="label">${s.label}</div>
            <div class="items">${splitItems(strip(s.text.replace(/<b>/g, OWN))).map(it => `<span${it.includes(OWN) ? ' class="own"' : ''}>${esc(it.replace(OWN, ''))}</span>`).join('')}</div>
        </div>`).join('');

    // ---------- off-beam ----------
    $('hobbies').innerHTML = P.hobbies.map(h => `
        <div class="hobby reveal">
            <span class="icon" aria-hidden="true">${h.icon}</span>
            <h3>${esc(titleCase(h.name))}</h3>
            <p>${esc(h.detail)}</p>
        </div>`).join('');

    // ---------- contact + footer ----------
    $('contact-links').innerHTML =
        (mail ? `<a class="contact-mail" href="${esc(mail.url)}">${esc(mail.url.replace(/^mailto:/, ''))}</a>` : '')
        + `<div class="link-row">${extLinks()}
            <a class="link" href="${CV_PDF}" target="_blank" rel="noopener">Download CV</a>
            <a class="link" href="/CV/plain.html" target="_blank" rel="noopener">Plain CV</a></div>`;
    $('footer-name').textContent = `Copyright © ${new Date().getFullYear()} ${titleCase(bare)}. All rights reserved.`;

    // ---------- reveal on scroll (staggered within rows) ----------
    const revealEls = [...document.querySelectorAll('.reveal')];
    revealEls.forEach(el => {
        const parent = el.parentElement;
        const cols = Math.max(1, (getComputedStyle(parent).gridTemplateColumns || '').split(' ').filter(Boolean).length);
        const sibs = [...parent.children].filter(c => c.classList.contains('reveal'));
        el.style.setProperty('--d', Math.min(3, sibs.indexOf(el) % cols) * 90 + 'ms');
    });
    const show = el => {
        if (el.classList.contains('in')) return;
        el.classList.add('in');
        // after the entrance, hand over to quick hover transitions
        setTimeout(() => el.classList.add('done'), 1000 + (parseInt(el.style.getPropertyValue('--d')) || 0));
    };
    if (reduceMotion || !('IntersectionObserver' in window)) revealEls.forEach(show);
    else {
        const io = new IntersectionObserver(entries => entries.forEach(e => {
            if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
        }), { rootMargin: '0px 0px -10% 0px' });
        revealEls.forEach(el => io.observe(el));
    }

    // ---------- scroll: one rAF pipeline; measuring is cached, off-screen work skipped ----------
    const topbar = document.querySelector('.topbar');
    const navLinks = [...document.querySelectorAll('.topnav a[href^="#"]')];
    const secs = navLinks.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
    const heroInner = document.querySelector('.hero-inner');
    // active section from an observer instead of measuring every section each frame
    if ('IntersectionObserver' in window) {
        const seen = new Map();
        const navIO = new IntersectionObserver(entries => {
            entries.forEach(e => seen.set(e.target, e.isIntersecting));
            const cur = secs.filter(s => seen.get(s)).pop();
            navLinks.forEach(a => a.classList.toggle('active', !!cur && a.getAttribute('href') === '#' + cur.id));
        }, { rootMargin: '-35% 0px -60% 0px' });
        secs.forEach(s => navIO.observe(s));
    }
    // career beam: geometry cached; nodes light as the beam reaches them
    const beamline = $('beamline'), nodes = [...beamline.querySelectorAll('.station')];
    let beamGeo = { top: 0, h: 1, nodeY: [] }, litCount = -1;
    const layoutBeam = () => {
        const r = beamline.getBoundingClientRect();
        beamGeo = { top: r.top + window.scrollY, h: Math.max(1, r.height), nodeY: nodes.map(n => n.offsetTop + 40) };
    };
    const paintBeam = y => {
        const vh = window.innerHeight;
        const p = reduceMotion ? 1 : Math.min(1, Math.max(0, (y + vh * 0.6 - beamGeo.top) / beamGeo.h));
        beamline.style.setProperty('--beam', p.toFixed(4));
        const front = p * beamGeo.h;
        const lit = beamGeo.nodeY.filter(ny => ny <= front + 2).length;
        if (lit !== litCount) { litCount = lit; nodes.forEach((n, k) => n.classList.toggle('lit', k < lit)); }
    };
    let ticking = false;
    function update() {
        ticking = false;
        const y = window.scrollY, vh = window.innerHeight;
        topbar.classList.toggle('scrolled', y > 10);
        if (!reduceMotion && y < vh * 1.2) {
            const t = Math.min(1, y / (vh * 0.85));
            heroInner.style.transform = `translate3d(0, ${(-y * 0.2).toFixed(1)}px, 0) scale(${(1 - t * 0.05).toFixed(4)})`;
            heroInner.style.opacity = (1 - t * 0.9).toFixed(3);
        }
        if (y + vh > beamGeo.top && y < beamGeo.top + beamGeo.h) paintBeam(y);   // only while the timeline is on screen (cached geometry)
        onLabScroll(y);
    }
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    const relayout = () => { layoutBeam(); update(); };
    window.addEventListener('resize', () => requestAnimationFrame(relayout));
    window.addEventListener('load', relayout);
    beamline.addEventListener('click', () => setTimeout(relayout, 600));   // "More" changes heights
    relayout();

    // ---------- visitor greeting ----------
    (async () => {
        const g = $('greeting'); if (!g) return;
        try {
            const ctl = new AbortController(); setTimeout(() => ctl.abort(), 5000);
            const cc = String((await (await fetch('https://api.country.is/', { signal: ctl.signal })).json()).country || '').toUpperCase();
            if (!/^[A-Z]{2}$/.test(cc)) return;
            let name = cc;
            try { name = new Intl.DisplayNames(['en'], { type: 'region' }).of(cc) || cc; } catch (e) { /* old browser */ }
            g.innerHTML = `<img src="https://flagcdn.com/40x30/${cc.toLowerCase()}.png" alt="">Hello, visitor from <b>${esc(name)}</b>`;
            g.classList.add('show');
        } catch (e) { /* lookup blocked or offline */ }
    })();

    // ---------- hero: a 3D magnetic-mirror "bottle" — field lines pinch at both ends,
    //            ions gyrate around them and bounce between the mirrors. Projected by hand onto a 2D canvas. ----------
    const cvs = $('field'), ctx = cvs.getContext('2d'), hero = document.querySelector('.hero');
    let W = 0, H = 0, visible = true, mxN = 0, myN = 0, txN = 0, tyN = 0, t0 = performance.now(), lines = [], ions = [];
    const small = () => window.innerWidth < 760;
    const L = 1, R = 0.42;                                                  // bottle half-length and waist radius (scene units)
    const radius = x => R * (0.42 + 0.58 * Math.cos(Math.PI * x / (2 * L)) ** 2);   // pinched ends = strong field (the mirrors)
    function build() {
        const nAng = small() ? 12 : 18, shells = small() ? [1] : [0.62, 1];
        lines = [];
        shells.forEach((sh, si) => { for (let k = 0; k < nAng; k++) lines.push({ th: (k + si * 0.5) / nAng * Math.PI * 2, sh }); });
        const nIons = small() ? 9 : 16;
        ions = Array.from({ length: nIons }, (_, k) => ({
            th: Math.random() * Math.PI * 2, sh: 0.35 + Math.random() * 0.6,   // guiding-centre field line
            amp: 0.55 + Math.random() * 0.35,                                // bounce amplitude (mirror points)
            wb: 0.25 + Math.random() * 0.2, pb: Math.random() * 6.3,         // bounce frequency / phase
            wc: 7 + Math.random() * 5, pc: Math.random() * 6.3,              // cyclotron frequency / phase
            rho: 0.018 + Math.random() * 0.018,                              // Larmor radius
            drift: (Math.random() < 0.5 ? -1 : 1) * (0.04 + Math.random() * 0.05)   // slow azimuthal (magnetron-like) drift
        }));
    }
    function size() {
        const dpr = Math.min(small() ? 1.25 : 1.5, window.devicePixelRatio || 1);
        W = hero.clientWidth; H = hero.clientHeight;
        cvs.width = W * dpr; cvs.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        build();
    }
    // camera: slow roll about the beam axis + gentle tilt that follows the mouse
    let cam;
    function setCam(t) {
        const roll = reduceMotion ? 0.6 : t * 0.07;
        const yaw = -0.62 + mxN * 0.25, pitch = 0.42 + myN * 0.18;
        cam = { cr: Math.cos(roll), sr: Math.sin(roll), cy: Math.cos(yaw), sy: Math.sin(yaw), cp: Math.cos(pitch), sp: Math.sin(pitch),
                scale: small() ? W * 0.58 : Math.min(W * 0.34, H * 0.7), cx: W / 2, cyy: H * 0.5, D: 2.8 };
    }
    function project(x, y, z) {
        let y1 = y * cam.cr - z * cam.sr, z1 = y * cam.sr + z * cam.cr;      // roll about x (beam axis)
        let x2 = x * cam.cy + z1 * cam.sy, z2 = -x * cam.sy + z1 * cam.cy;   // yaw
        let y3 = y1 * cam.cp - z2 * cam.sp, z3 = y1 * cam.sp + z2 * cam.cp;  // pitch
        const f = cam.D / (cam.D + z3);
        return [cam.cx + x2 * f * cam.scale, cam.cyy + y3 * f * cam.scale, z3];
    }
    const depthAlpha = z => 0.35 + 0.65 * Math.min(1, Math.max(0, (0.9 - z) / 1.8));   // nearer = darker
    function draw(now) {
        const t = ((now || performance.now()) - t0) / 1000;
        mxN += (txN - mxN) * 0.05; myN += (tyN - myN) * 0.05;
        setCam(t);
        ctx.clearRect(0, 0, W, H);
        ctx.lineWidth = 1;
        // field lines
        const seg = small() ? 36 : 56;
        for (const ln of lines) {
            const c = Math.cos(ln.th), sn = Math.sin(ln.th);
            let zSum = 0;
            ctx.beginPath();
            for (let k = 0; k <= seg; k++) {
                const x = -L * 1.12 + 2.24 * L * k / seg, r = radius(x) * ln.sh;
                const [px, py, pz] = project(x, r * c, r * sn); zSum += pz;
                k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
            }
            ctx.strokeStyle = `rgba(29, 29, 31, ${(0.11 * depthAlpha(zSum / (seg + 1)) * (ln.sh < 1 ? 0.7 : 1)).toFixed(3)})`;
            ctx.stroke();
        }
        // ions: helix around a field line, bouncing between the mirrors, with a short fading trail
        const trail = small() ? 10 : 16, dt = 0.045;
        for (const p of ions) {
            const pos = tt => {
                const x = p.amp * L * Math.sin(p.wb * tt * Math.PI * 2 / 6 + p.pb);
                const th = p.th + p.drift * tt;
                const r = radius(x) * p.sh, rho = p.rho * (radius(x) / R);   // gyro-radius shrinks where the field is strong
                const ph = p.wc * tt + p.pc;
                const ry = r * Math.cos(th), rz = r * Math.sin(th);
                // gyration in the plane perpendicular to the beam axis
                return project(x, ry + rho * Math.cos(ph), rz + rho * Math.sin(ph));
            };
            let prev = pos(t), head = prev;
            for (let k = 1; k <= trail; k++) {
                const cur = pos(t - k * dt);
                const a = (1 - k / trail) * 0.38 * depthAlpha(prev[2]);
                ctx.strokeStyle = `rgba(29, 29, 31, ${a.toFixed(3)})`;
                ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(cur[0], cur[1]); ctx.stroke();
                prev = cur;
            }
            ctx.fillStyle = `rgba(29, 29, 31, ${(0.55 * depthAlpha(head[2])).toFixed(3)})`;
            ctx.beginPath(); ctx.arc(head[0], head[1], 1.7, 0, Math.PI * 2); ctx.fill();
        }
        if (!reduceMotion && visible) requestAnimationFrame(draw);
    }
    window.addEventListener('pointermove', e => {
        if (!visible) return;
        txN = e.clientX / window.innerWidth - 0.5; tyN = e.clientY / window.innerHeight - 0.5;
        if (reduceMotion) draw();
    }, { passive: true });
    window.addEventListener('resize', () => { size(); if (reduceMotion) draw(); });
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(([e]) => {
            const was = visible; visible = e.isIntersecting;
            if (visible && !was && !reduceMotion) requestAnimationFrame(draw);
        }).observe(hero);
    }
    size(); draw();
})();
