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

    // statement: one <span> per word so each can light up
    const stmt = $('statement'), stmtText = P.statement || strip(P.summary);
    stmt.innerHTML = stmtText.split(/\s+/).map(w => `<span>${esc(w)}</span> `).join('');
    const stmtWords = [...stmt.children];
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
                <ul>${r.bullets.map(b => `<li>${b}</li>`).join('')}</ul>
            </div>
        </li>`;
    }).join('');

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
    let labShift = 0, labX = 0, labTarget = 0, labRunning = false;
    const touchSmall = window.matchMedia('(max-width: 760px), (hover: none) and (pointer: coarse)').matches;
    const labStatic = reduceMotion || touchSmall || !tiles.length;          // phones/tablets: natural swipe row
    if (!tiles.length) lab.remove();
    else if (labStatic) lab.classList.add('static');
    function layoutLab() {
        if (labStatic) return;
        const vw = window.innerWidth, tw = tiles[0].offsetWidth;          // layout width, unaffected by the scale
        track.style.setProperty('--pad', ((vw - tw) / 2) + 'px');           // first and last photo can sit dead centre
        labShift = Math.max(0, tiles[tiles.length - 1].offsetLeft - tiles[0].offsetLeft);   // first photo centred → last photo centred
        lab.style.height = (labShift * 0.55 + window.innerHeight) + 'px';    // scroll distance while pinned (shorter = less 'stuck')
        labTarget = labX = targetLab(); paintLab();
    }
    function targetLab() {
        const r = lab.getBoundingClientRect(), span = lab.offsetHeight - window.innerHeight;
        const prog = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
        bar.style.transform = `scaleX(${prog.toFixed(4)})`;
        return -prog * labShift;
    }
    function paintLab() {
        track.style.transform = `translate3d(${labX.toFixed(2)}px, 0, 0)`;
        const mid = window.innerWidth / 2;
        let best = null, bestD = Infinity;
        const step = tiles.length > 1 ? tiles[1].offsetLeft - tiles[0].offsetLeft : 1;
        for (const t of tiles) {
            const off = t.offsetLeft + labX + t.offsetWidth / 2 - mid;      // distance from screen centre
            const n = Math.min(2.2, Math.abs(off) / step);                   // in "tiles away"
            const sc = 1 - 0.38 * Math.min(1, n) - 0.08 * Math.max(0, n - 1); // centre 1.0 → neighbours 0.62 → further ~0.52
            const pull = -Math.sign(off) * (1 - sc) * t.offsetWidth * 0.42;  // close the gap a smaller tile leaves
            t.style.transform = `translate3d(${pull.toFixed(1)}px, 0, 0) scale(${sc.toFixed(4)})`;
            t.style.opacity = (1 - 0.35 * Math.min(1, n) - 0.25 * Math.max(0, n - 1)).toFixed(3);
            t.style.zIndex = String(100 - Math.round(n * 10));
            if (Math.abs(off) < bestD) { bestD = Math.abs(off); best = t; }
        }
        tiles.forEach(t => t.classList.toggle('active', t === best));
    }
    function labLoop() {                                                    // eased follow for a buttery glide
        labX += (labTarget - labX) * 0.12;
        paintLab();
        if (Math.abs(labTarget - labX) > 0.3) requestAnimationFrame(labLoop); else { labX = labTarget; paintLab(); labRunning = false; }
    }
    function onLabScroll() {
        if (labStatic) return;
        labTarget = targetLab();
        if (!labRunning) { labRunning = true; requestAnimationFrame(labLoop); }
    }
    if (!labStatic) {
        window.addEventListener('scroll', onLabScroll, { passive: true });
        window.addEventListener('resize', layoutLab);
        window.addEventListener('load', layoutLab);
        // start loading every gallery photo as the section approaches, so none pop in mid-slide
        const preload = () => tiles.forEach(t => { const i = t.querySelector('img'); if (i) i.loading = 'eager'; });
        if ('IntersectionObserver' in window) {
            const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { preload(); io.disconnect(); } }, { rootMargin: '150% 0px' });
            io.observe(lab);
        } else preload();
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
        setTimeout(() => { modal.hidden = true; frame.innerHTML = ''; lastFocus?.focus(); }, 350);
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
        const sibs = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
        el.style.setProperty('--d', (sibs.indexOf(el) % 3) * 110 + 'ms');
    });
    const show = el => {
        if (el.classList.contains('in')) return;
        el.classList.add('in');
        // after the entrance, hand over to quick hover transitions
        setTimeout(() => el.classList.add('done'), 1400 + (parseInt(el.style.getPropertyValue('--d')) || 0));
    };
    if (reduceMotion || !('IntersectionObserver' in window)) revealEls.forEach(show);
    else {
        const io = new IntersectionObserver(entries => entries.forEach(e => {
            if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
        }), { rootMargin: '0px 0px -10% 0px' });
        revealEls.forEach(el => io.observe(el));
    }

    // ---------- scroll: top bar, active link, hero exit, reveal backup (once per frame) ----------
    const topbar = document.querySelector('.topbar');
    const navLinks = [...document.querySelectorAll('.topnav a[href^="#"]')];   // in-page section links only
    const secs = navLinks.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
    const heroInner = document.querySelector('.hero-inner');
    const zoomSec = $('zoomsec'), zoomMedia = $('zoom-media'), zoomCopy = $('zoom-copy');
    window.addEventListener('resize', () => requestAnimationFrame(update));
    let ticking = false;
    const update = () => {
        ticking = false;
        const y = window.scrollY, vh = window.innerHeight;
        topbar.classList.toggle('scrolled', y > 10);
        if (!reduceMotion && y < vh * 1.2) {
            const t = Math.min(1, y / (vh * 0.85));
            heroInner.style.transform = `translate3d(0, ${(-y * 0.2).toFixed(1)}px, 0) scale(${(1 - t * 0.05).toFixed(4)})`;
            heroInner.style.opacity = (1 - t * 0.9).toFixed(3);
        }
        // photo grows from a rounded card to full screen, then the headline fades in
        if (!reduceMotion && zoomSec && zoomMedia) {
            const r = zoomSec.getBoundingClientRect(), span = zoomSec.offsetHeight - vh;
            const p = Math.min(1, Math.max(0, -r.top / span));
            const e = 1 - Math.pow(1 - Math.min(1, p / 0.62), 3);                 // ease-out over the first ~60%
            const vw = window.innerWidth;
            const cardW = Math.min(vw * (vw < 700 ? 0.86 : 0.62), 980), cardH = Math.min(vh * 0.62, cardW * 0.62);
            zoomMedia.style.setProperty('--ix', ((vw - cardW) / 2 * (1 - e)).toFixed(1) + 'px');
            zoomMedia.style.setProperty('--iy', ((vh - cardH) / 2 * (1 - e)).toFixed(1) + 'px');
            zoomMedia.style.setProperty('--r', (28 * (1 - e)).toFixed(1) + 'px');
            zoomMedia.style.setProperty('--s', (1.05 - 0.05 * e).toFixed(4));
            const t = Math.min(1, Math.max(0, (p - 0.55) / 0.25));
            zoomCopy.style.setProperty('--t', t.toFixed(3));
            zoomMedia.style.setProperty('--dim', (0.48 * t).toFixed(3));
        }
        // statement words light up across the section
        if (stmtWords.length) {
            const r = stmt.getBoundingClientRect();
            const p = reduceMotion ? 1 : Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
            const lit = Math.round(p * stmtWords.length);
            stmtWords.forEach((w, k) => w.classList.toggle('lit', k < lit));
        }
        let cur = null;
        secs.forEach(s => { if (s.getBoundingClientRect().top < vh * 0.4) cur = s; });
        navLinks.forEach(a => a.classList.toggle('active', !!cur && a.getAttribute('href') === '#' + cur.id));
        for (const el of revealEls) if (!el.classList.contains('in') && el.getBoundingClientRect().top < vh * 0.92) show(el);
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();

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

    // ---------- hero: soft field lines bending around the cursor, with drifting ions ----------
    const cvs = $('field'), ctx = cvs.getContext('2d'), hero = document.querySelector('.hero');
    let W = 0, H = 0, mx = -9999, my = -9999, tx = -9999, ty = -9999, visible = true, ions = [];
    const LINES = 15;
    function size() {
        const dpr = Math.min(1.5, window.devicePixelRatio || 1);
        W = hero.clientWidth; H = hero.clientHeight;
        cvs.width = W * dpr; cvs.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ions = Array.from({ length: Math.round(W / 24) }, () => newIon(true));
    }
    function newIon(anywhere) {
        return { lane: Math.floor(Math.random() * LINES), x: anywhere ? Math.random() * W : -10, v: 0.15 + Math.random() * 0.35, a: 0.25 + Math.random() * 0.5 };
    }
    const laneY = i => H * (0.1 + 0.8 * i / (LINES - 1));
    function bend(x, y0) {
        const dx = x - mx, dy = y0 - my, f = 70 * Math.exp(-(dx * dx + dy * dy) / 25600);
        return y0 + (dy >= 0 ? f : -f) * Math.min(1, Math.abs(dy) / 40 + 0.2);
    }
    function draw() {
        mx += (tx - mx) * 0.06; my += (ty - my) * 0.06;
        ctx.clearRect(0, 0, W, H);
        for (let i = 0; i < LINES; i++) {
            const y0 = laneY(i), edge = Math.min(i, LINES - 1 - i);
            ctx.strokeStyle = `rgba(0, 113, 227, ${0.05 + edge * 0.01})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let x = 0; x <= W + 16; x += 16) { const y = bend(x, y0); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
            ctx.stroke();
        }
        for (const p of ions) {
            if (!reduceMotion) p.x += p.v;
            if (p.x > W + 10) Object.assign(p, newIon(false));
            ctx.fillStyle = `rgba(0, 113, 227, ${p.a * 0.6})`;
            ctx.beginPath(); ctx.arc(p.x, bend(p.x, laneY(p.lane)), 1.4, 0, Math.PI * 2); ctx.fill();
        }
        if (!reduceMotion && visible) requestAnimationFrame(draw);
    }
    window.addEventListener('pointermove', e => {
        const r = cvs.getBoundingClientRect();
        tx = e.clientX - r.left; ty = e.clientY - r.top;
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
