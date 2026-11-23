/* =====================================================================
   Apple-inspired polish:
   1. Liquid Glass: a light highlight on the glass surfaces (top bar, player) that follows the pointer,
      and a dark version of the top bar while it floats over the dark Lab section.
   2. The About paragraph lights up word by word as you scroll through it.
   3. An Apple-style footer: a small site map in columns, languages and fine print.
   (The glass look and the dark Lab section themselves are in v2.css.)
   ===================================================================== */
(function () {
    const P = window.PROFILE || {}, T = window.T || (s => s), LANG = window.LANG || 'en';
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    // ---------- 1. Liquid Glass: pointer-following highlight ----------
    if (fine && !reduce) {
        let raf = 0, ev = null;
        document.addEventListener('pointermove', e => {
            ev = e;
            if (raf) return;
            raf = requestAnimationFrame(() => {
                raf = 0;
                for (const el of document.querySelectorAll('.topbar, .mp')) {
                    const r = el.getBoundingClientRect();
                    const near = ev.clientX > r.left - 60 && ev.clientX < r.right + 60 && ev.clientY > r.top - 60 && ev.clientY < r.bottom + 60;
                    el.classList.toggle('lit', near);
                    if (near) {
                        el.style.setProperty('--lx', ((ev.clientX - r.left) / r.width * 100).toFixed(1) + '%');
                        el.style.setProperty('--ly', ((ev.clientY - r.top) / r.height * 100).toFixed(1) + '%');
                    }
                }
            });
        }, { passive: true });
    }

    // the top bar turns dark while it floats over the dark Lab section, like apple.com
    const bar = document.getElementById('topbar'), lab = document.getElementById('lab');
    if (bar && lab) {
        const check = () => {
            const r = lab.getBoundingClientRect(), mid = bar.getBoundingClientRect().bottom / 2 + 6;
            bar.classList.toggle('on-dark', r.top <= mid && r.bottom >= mid);
        };
        let t = 0;
        addEventListener('scroll', () => { if (!t) t = requestAnimationFrame(() => { t = 0; check(); }); }, { passive: true });
        addEventListener('resize', check); check();
    }

    // ---------- 2. About text lights up word by word ----------
    const about = document.getElementById('about-body');
    if (about && !reduce) {
        const walker = document.createTreeWalker(about, NodeFilter.SHOW_TEXT);
        const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
        for (const n of nodes) {
            const parts = n.textContent.split(/(\s+)/), frag = document.createDocumentFragment();
            for (const part of parts) {
                if (!part) continue;
                if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
                else { const s = document.createElement('span'); s.className = 'w'; s.textContent = part; frag.appendChild(s); }
            }
            n.parentNode.replaceChild(frag, n);
        }
        const words = [...about.querySelectorAll('.w')];
        about.classList.add('words');
        let lit = -1;
        const update = () => {
            const r = about.getBoundingClientRect(), vh = innerHeight;
            // starts when the paragraph enters the lower part of the screen, finished by the time it reaches the upper third
            const start = vh * 0.88, end = vh * 0.32;
            const p = Math.min(1, Math.max(0, (start - r.top) / (start - end + r.height * 0.4)));
            const n = Math.round(p * words.length);
            if (n === lit) return;
            const lo = Math.min(n, lit < 0 ? 0 : lit), hi = Math.max(n, lit < 0 ? words.length : lit);
            for (let i = lo; i < hi; i++) words[i].classList.toggle('on', i < n);
            lit = n;
        };
        let t = 0;
        addEventListener('scroll', () => { if (!t) t = requestAnimationFrame(() => { t = 0; update(); }); }, { passive: true });
        addEventListener('resize', update); update();
    }

    // ---------- theme: auto (follows the system), light or dark ----------
    const root = document.documentElement, mq = matchMedia('(prefers-color-scheme: dark)');
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    function applyTheme(pref, save) {
        if (save) { try { localStorage.setItem('cv-theme', pref); } catch (e) { /* private mode */ } }
        const dark = pref === 'dark' || (pref === 'auto' && mq.matches);
        root.dataset.theme = dark ? 'dark' : 'light'; root.dataset.themePref = pref;
        window.cvInkRGB = dark ? '245, 245, 247' : '29, 29, 31';
        if (themeMeta) themeMeta.content = dark ? '#000000' : '#f7f7f8';
        document.querySelectorAll('.foot-theme button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.theme === pref)));
        window.dispatchEvent(new Event('resize'));          // canvas scenes redraw in the new ink
    }
    mq.addEventListener?.('change', () => { if ((root.dataset.themePref || 'auto') === 'auto') applyTheme('auto'); });
    window.cvTheme = { set: p => applyTheme(p, true), get: () => root.dataset.themePref || 'auto' };
    if (themeMeta && root.dataset.theme === 'dark') themeMeta.content = '#000000';

    // ---------- 3. Apple-style footer ----------
    const footer = document.querySelector('.footer');
    if (footer) {
        const links = P.links || [];
        const find = re => links.find(l => re.test(l.url) || re.test(l.label || ''));
        const a = (href, label, ext) => href ? `<li><a href="${esc(href)}"${ext ? ' target="_blank" rel="noopener"' : ''}>${esc(label)}</a></li>` : '';
        // section links reuse the top bar's (already translated) labels
        const nav = [...document.querySelectorAll('#ln-nav a[href^="#"]:not(.ln-mobile)')].map(x => a(x.getAttribute('href'), x.textContent.trim()));
        const mail = find(/^mailto:/), li = find(/linkedin/i), gs = find(/scholar\.google/i), yt = find(/youtube/i);
        const gh = links.find(l => /^github$/i.test(l.label || ''));
        const bemcs = find(/PY-BEMCS/i), aegis = links.filter(l => /AEgIS/i.test(l.label || ''));   // outreach: digital twin + gravity game
        const cols = [
            [T('Explore'), nav.join('')],
            [T('Connect'), a(mail && mail.url, mail ? mail.url.replace(/^mailto:/, '') : '') + a(li && li.url, 'LinkedIn', 1) + a(gs && gs.url, 'Google Scholar', 1) + a(gh && gh.url, 'GitHub', 1) + a(yt && yt.url, 'YouTube', 1)],
            [T('Projects'), a(bemcs && bemcs.url, 'PY-BEMCS', 1) + aegis.map(l => a(l.url, l.label, 1)).join('')],
            [T('Resume'), a('/CV/plain.html', T('Plain CV'), 1) + a('/CV/assets/cv/Bharat_Rawat_CV.pdf', T('Download CV') + ' (PDF)', 1) + a('/CV/classic.html', T('Classic site')) + a('/Dossier/', T('All themes')) + ((P.news || []).length ? a('/CV/news/', T('News'), 1) : '')]
        ];
        const langs = [['en', 'English'], ['es', 'Español'], ['ru', 'Русский'], ['fr', 'Français'], ['gu', 'ગુજરાતી']]
            .map(([c, n]) => c === LANG ? `<span aria-current="true">${n}</span>` : `<a href="?lang=${c}" data-lang="${c}">${n}</a>`).join('<i>|</i>');
        const name = document.getElementById('footer-name')?.textContent || '';
        footer.innerHTML = `
            <div class="wrap">
                <p class="foot-fine">${T('Built from scratch with HTML, CSS and JavaScript. Simulations and photos are from my own work.')}</p>
                <nav class="foot-cols" aria-label="${T('Site map')}">
                    ${cols.map(([h, items]) => `<div class="foot-col"><h4>${h}</h4><ul>${items}</ul></div>`).join('')}
                </nav>
                <div class="foot-bottom">
                    <span id="footer-name">${esc(name)}</span>
                    <span class="foot-right">
                        <span class="foot-theme" role="group" aria-label="${T('Appearance')}">${[['auto', T('Auto')], ['light', T('Light')], ['dark', T('Dark')]]
                            .map(([k, l]) => `<button type="button" data-theme="${k}" aria-pressed="${(root.dataset.themePref || 'auto') === k}">${l}</button>`).join('')}</span>
                        <span class="foot-langs">${langs}</span>
                    </span>
                </div>
            </div>`;
        footer.classList.add('foot-apple');
        footer.querySelectorAll('.foot-theme button').forEach(b => b.addEventListener('click', () => applyTheme(b.dataset.theme, true)));
        footer.querySelectorAll('[data-lang]').forEach(l => l.addEventListener('click', () => { try { localStorage.setItem('cv-lang', l.dataset.lang); } catch (e) { /* private mode */ } }));
    }
})();
