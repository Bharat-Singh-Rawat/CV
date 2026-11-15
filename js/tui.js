/* ═══════════════════════════════════════════════════════════════════
   TUI renderer: turns window.PROFILE into a terminal session.
   Sections, tabs, typing reveal, boot screen, console toggle, knight egg.
   ═══════════════════════════════════════════════════════════════════ */
window.TUI = (function () {
    const P = window.PROFILE;
    const $ = id => document.getElementById(id);
    const main = $('pane-main');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const strip = html => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent; };
    const map = (a, f) => (a || []).map(f).join('');
    const PORTFOLIO = 'https://bharatbharat22.wixsite.com/website';

    if (!P) { main.innerHTML = '<p>profile.js failed to load — please refresh.</p>'; return {}; }

    // ── tiny 5-row block font for the neofetch banner ──
    const FONT = {
        A: [' ### ', '#   #', '#####', '#   #', '#   #'], B: ['#### ', '#   #', '#### ', '#   #', '#### '], C: [' ####', '#    ', '#    ', '#    ', ' ####'],
        D: ['#### ', '#   #', '#   #', '#   #', '#### '], E: ['#####', '#    ', '#### ', '#    ', '#####'], F: ['#####', '#    ', '#### ', '#    ', '#    '],
        G: [' ####', '#    ', '#  ##', '#   #', ' ####'], H: ['#   #', '#   #', '#####', '#   #', '#   #'], I: ['#####', '  #  ', '  #  ', '  #  ', '#####'],
        J: ['#####', '   # ', '   # ', '#  # ', ' ##  '], K: ['#   #', '#  # ', '###  ', '#  # ', '#   #'], L: ['#    ', '#    ', '#    ', '#    ', '#####'],
        M: ['#   #', '## ##', '# # #', '#   #', '#   #'], N: ['#   #', '##  #', '# # #', '#  ##', '#   #'], O: [' ### ', '#   #', '#   #', '#   #', ' ### '],
        P: ['#### ', '#   #', '#### ', '#    ', '#    '], Q: [' ### ', '#   #', '# # #', '#  # ', ' ## #'], R: ['#### ', '#   #', '#### ', '#  # ', '#   #'],
        S: [' ####', '#    ', ' ### ', '    #', '#### '], T: ['#####', '  #  ', '  #  ', '  #  ', '  #  '], U: ['#   #', '#   #', '#   #', '#   #', ' ### '],
        V: ['#   #', '#   #', '#   #', ' # # ', '  #  '], W: ['#   #', '#   #', '# # #', '## ##', '#   #'], X: ['#   #', ' # # ', '  #  ', ' # # ', '#   #'],
        Y: ['#   #', ' # # ', '  #  ', '  #  ', '  #  '], Z: ['#####', '   # ', '  #  ', ' #   ', '#####'], '.': ['  ', '  ', '  ', '  ', '# '], ' ': ['  ', '  ', '  ', '  ', '  ']
    };
    const figlet = text => {
        const rows = ['', '', '', '', ''];
        for (const ch of text.toUpperCase()) { const g = FONT[ch] || FONT[' ']; g.forEach((r, i) => rows[i] += r + ' '); }
        return rows.map(r => r.replace(/#/g, '█').replace(/\s+$/, '')).join('\n');
    };
    const bareName = P.name.replace(/,.*$/, '').trim();                 // "BHARAT SINGH RAWAT"
    const words = bareName.split(/\s+/);
    const bannerText = words.slice(0, -1).map(w => w[0] + '.').join('') + ' ' + words[words.length - 1];   // "B.S. RAWAT"

    const year = s => (String(s).match(/\b(19|20)\d{2}\b/) || [''])[0];
    const yrsExp = (strip(P.summary).match(/(\d+\+?)\s*years/) || [])[1] || '';
    const now = P.experience[0];

    // ── section definitions ──
    const ps1 = path => `<span class="ps1">guest@rawat-lab:<span class="path">${path}</span>$</span>`;
    const entry = (e, i, isJob) => `
        <article class="entry${isJob && /present/i.test(e.dates) && i === 0 ? ' now' : ''}">
            <div class="entry-head"><span class="role">${e.role}${isJob && /present/i.test(e.dates) && i === 0 ? '<span class="tag-now">NOW</span>' : ''}</span><span class="date">${e.dates}</span></div>
            <div class="org">${e.org}</div>
            <ul class="bul">${map(e.bullets, b => `<li>${b}</li>`)}</ul>
        </article>`;

    const SECTIONS = [
        {
            id: 'about', tab: 'about', path: '~', cmd: 'neofetch <span class="flag">--profile</span>',
            html: () => `
                <div class="fetch">
                    <pre class="figlet" aria-hidden="true">${figlet(bannerText)}</pre>
                    <div class="fetch-info">
                        <div class="who">guest@rawat-lab</div>
                        <div class="sep">────────────────────────────────────────</div>
                        <div class="kv">
                            <span class="k">Role</span><span class="v">${now.role}</span>
                            <span class="k">Host</span><span class="v">${now.org}</span>
                            <span class="k">Field</span><span class="v">${P.title.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase())}</span>
                            ${yrsExp ? `<span class="k">Uptime</span><span class="v">${yrsExp} years</span>` : ''}
                            <span class="k">Packages</span><span class="v">${P.publications.length} publications · ${P.talks.length} talks</span>
                            <span class="k">Shell</span><span class="v">press <kbd>\`</kbd> for a console</span>
                        </div>
                        <div class="palette" aria-hidden="true"><i style="background:var(--accent)"></i><i style="background:var(--accent-2)"></i><i style="background:var(--amber)"></i><i style="background:var(--magenta)"></i><i style="background:var(--red)"></i><i style="background:var(--blue)"></i><i style="background:var(--fg)"></i></div>
                    </div>
                </div>
                <h1 class="hero-name">${P.name}</h1>
                <p class="hero-title">// ${P.title}</p>
                <p class="hero-sum">${P.summary}</p>
                <div class="btn-row">${P.links.map((l, i) => `<a class="key key-c${i % 5}" href="${l.url}" target="_blank" rel="noopener">${l.label} ↗</a>`).join('')}
                    <a class="key key-c${P.links.length % 5}" href="${PORTFOLIO}" target="_blank" rel="noopener">FULL_PORTFOLIO ↗</a>
                    <a class="key key-plain" href="plain.html" target="_blank" rel="noopener">PLAIN_CV / PRINT ↗</a></div>`
        },
        {
            id: 'experience', tab: 'experience', path: '~', cmd: 'cat experience/*.log',
            html: () => map(P.experience, (e, i) => entry(e, i, true))
        },
        {
            id: 'education', tab: 'education', path: '~', cmd: 'cat education/*.log',
            html: () => map(P.education, (e, i) => entry(e, i, false))
        },
        {
            id: 'publications', tab: 'publications', path: '~', cmd: 'ls <span class="flag">-lt</span> publications/',
            html: () => `
                <div class="ls-total">total ${P.publications.length}</div>
                <table class="ls"><tbody>${map(P.publications, p => `
                    <tr><td class="perm">-r--r--r--</td><td class="yr">${year(p.venue)}</td><td class="ven">${p.venue.replace(/\s*\(\d{4}\)\s*/, '')}</td><td class="ttl">${p.title}</td></tr>`)}
                </tbody></table>`
        },
        {
            id: 'talks', tab: 'talks', path: '~', cmd: 'grep <span class="flag">-h</span> "talk" /var/log/conferences/*.log',
            html: () => `<ul class="log">${map(P.talks, t => `
                <li><span class="lvl ${/invited/i.test(t.type) ? 'inv' : 'con'}">[${t.type.replace(/\s*talk/i, '').toUpperCase()}]</span><span class="ts">${year(t.text)}</span><span class="msg">${t.text}</span></li>`)}</ul>`
        },
        {
            id: 'skills', tab: 'skills', path: '~', cmd: 'cat ~/.config/skills.conf',
            html: () => {
                let n = 0;
                const ln = (inner) => `<div class="line"><span class="ln">${++n}</span><span>${inner}</span></div>`;
                return `<div class="conf">${ln('<span class="comment"># generated from profile.js — software stack &amp; expertise</span>')}${ln('<span class="sec">[stack]</span>')}${map(P.skills, s => ln(`<span class="ck">${s.label}</span> <span class="eq">=</span> <span class="cv">${s.text}</span>`))}${ln('')}${ln('<span class="sec">[core]</span>')}${ln(`<span class="ck">expertise</span> <span class="eq">=</span> <span class="cv">${P.expertise}</span>`)}</div>`;
            }
        },
        {
            id: 'hobbies', tab: 'hobbies', path: '~', cmd: 'ps aux <span class="flag">--sort=-joy</span> | grep hobby',
            html: () => `
                <table class="ps"><thead><tr><th class="pid">PID</th><th>STAT</th><th>TAG</th><th>COMMAND</th><th>DETAIL</th></tr></thead><tbody>${map(P.hobbies, (h, i) => `
                    <tr class="proc${/chess/i.test(h.name) ? ' clickable' : ''}" data-hobby="${h.name}" ${/chess/i.test(h.name) ? 'tabindex="0" role="button" aria-label="Chess easter egg"' : ''}>
                        <td class="pid">${1337 + i * 211}</td><td class="st">R</td><td class="tg">${h.tag}</td><td class="nm">${h.icon} ${h.name.toLowerCase()}</td><td>${h.detail}</td></tr>`)}
                </tbody></table>
                <div id="hobby-readout">// select a process… (♟ chess is interactive)</div>`
        },
        {
            id: 'shell', tab: 'shell', path: '~', cmd: '<span class="comment"># your turn — press ` or click here to open a console</span>',
            html: () => ''
        }
    ];

    // ── render ──
    main.innerHTML = SECTIONS.map(s => `
        <section class="blk${reduced ? '' : ' pending'}${s.id === 'shell' ? ' your-turn' : ''}" id="${s.id}" data-tab="${s.tab}" aria-labelledby="h-${s.id}">
            <div class="prompt-line" id="h-${s.id}">${ps1(s.path)} <span class="cmd" data-full="${encodeURIComponent(s.cmd)}">${s.cmd}</span>${s.id === 'shell' ? ' <span class="caret"></span>' : ''}</div>
            <div class="out">${s.html()}</div>
        </section>`).join('');

    // tabs
    const tabs = $('tm-tabs');
    tabs.innerHTML = SECTIONS.map((s, i) => `<a href="#${s.id}" data-id="${s.id}">${i}:${s.tab}</a>`).join('');
    tabs.addEventListener('click', e => {
        const a = e.target.closest('a'); if (!a) return;
        e.preventDefault(); goto(a.dataset.id);
    });
    function goto(id) {
        const el = $(id); if (!el) return;
        el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        history.replaceState(null, '', '#' + id);
        reveal(el);
    }
    const tabObs = new IntersectionObserver(entries => {
        entries.forEach(en => {
            if (!en.isIntersecting) return;
            tabs.querySelectorAll('a').forEach(a => a.classList.toggle('active', a.dataset.id === en.target.id));
        });
    }, { rootMargin: '-35% 0px -60% 0px' });
    main.querySelectorAll('.blk').forEach(b => tabObs.observe(b));

    // side links
    $('side-links').innerHTML = map(P.links, l => `<a href="${l.url}" target="_blank" rel="noopener"><span>${l.label} ↗</span><span class="u">${l.url.replace(/^https?:\/\//, '')}</span></a>`)
        + `<a href="${PORTFOLIO}" target="_blank" rel="noopener"><span>View Full Portfolio ↗</span><span class="u">${PORTFOLIO.replace(/^https?:\/\//, '')}</span></a>`
        + `<a href="/Dossier/"><span>← all themes</span><span class="u">Dossier portal</span></a>`
        + `<a href="plain.html" target="_blank" rel="noopener"><span>plain CV ↗</span><span class="u">clean, printable version</span></a>`
        + `<a href="classic.html"><span>classic layout</span><span class="u">previous Terminal_View design</span></a>`;

    // ── typing reveal ──
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    async function reveal(blk) {
        if (!blk || !blk.classList.contains('pending') || blk.dataset.typing) return;
        blk.dataset.typing = '1';
        const cmd = blk.querySelector('.cmd');
        const full = decodeURIComponent(cmd.dataset.full);
        const text = strip(full);
        cmd.textContent = ''; cmd.style.visibility = 'visible';
        const caret = document.createElement('span'); caret.className = 'caret'; cmd.after(caret);
        for (let i = 0; i < text.length; i++) {
            cmd.textContent += text[i];
            if (i % 2 === 0) SFX.key();
            await sleep(text.length > 40 ? 10 : 22);
        }
        await sleep(120);
        cmd.innerHTML = full; cmd.style.visibility = '';
        if (blk.id !== 'shell') caret.remove();
        else blk.querySelectorAll('.caret').forEach((c, i) => { if (i > 0) c.remove(); });
        blk.classList.remove('pending');
    }
    let booted = false;
    const revealObs = new IntersectionObserver(entries => {
        if (!booted) return;
        entries.forEach(en => { if (en.isIntersecting) { reveal(en.target); revealObs.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -12% 0px' });
    main.querySelectorAll('.blk').forEach(b => revealObs.observe(b));
    const revealVisible = () => main.querySelectorAll('.blk.pending').forEach(b => {
        const r = b.getBoundingClientRect(); if (r.top < innerHeight * 0.88 && r.bottom > 0) reveal(b);
    });

    // ── console toggle ──
    const con = $('console');
    function consoleOpen(open) {
        const want = open === undefined ? !con.classList.contains('open') : open;
        con.classList.toggle('open', want);
        con.setAttribute('aria-hidden', String(!want));
        if (want) setTimeout(() => $('shell-input').focus({ preventScroll: true }), 60);
        else $('shell-input').blur();
    }
    $('console-btn').addEventListener('click', () => consoleOpen());
    $('shell').addEventListener('click', () => consoleOpen(true));
    window.addEventListener('keydown', e => {
        const typing = e.target.closest && e.target.closest('input, textarea, select, [contenteditable]');
        if (e.key === '`' && (!typing || e.target.id === 'shell-input')) { e.preventDefault(); consoleOpen(); }
        else if (e.key === 'Escape' && con.classList.contains('open')) consoleOpen(false);
    });

    // ── wall messages (tour / broadcasts) ──
    const wallEl = $('wall'); let wallT = null;
    function wall(msg, ms = 4000, head = 'Broadcast message from operator@rawat-lab') {
        wallEl.innerHTML = `<div class="wall-head">${head} (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}):</div>${msg}`;
        wallEl.classList.add('show'); clearTimeout(wallT);
        if (ms > 0) wallT = setTimeout(() => wallEl.classList.remove('show'), ms);
    }
    const wallHide = () => wallEl.classList.remove('show');

    // ── chess knight easter egg ──
    const readout = $('hobby-readout');
    let knightBusy = false;
    function knight(fromEl) {
        if (knightBusy) return; knightBusy = true;
        const r = (fromEl || $('hobbies')).getBoundingClientRect();
        const g = document.createElement('div'); g.className = 'knight-ghost'; g.textContent = '♞';
        g.style.left = (r.left + 40) + 'px'; g.style.top = (r.top + r.height / 2 - 24) + 'px';
        document.body.appendChild(g); SFX.tick();
        const sq = Math.min(90, innerWidth / 9);
        requestAnimationFrame(() => {
            g.style.transform = `translate(0, ${-2 * sq}px)`;                      // two squares up…
            setTimeout(() => { g.style.transform = `translate(${sq}px, ${-2 * sq}px)`; SFX.tick(); }, 500);   // …one across: an L
        });
        readout.textContent = '> KNIGHT_JUMP: L-trajectory executed · ELO 1900 confirmed';
        setTimeout(() => { g.remove(); knightBusy = false; }, 1600);
    }
    main.addEventListener('click', e => {
        const row = e.target.closest('tr.proc'); if (!row) return;
        if (/chess/i.test(row.dataset.hobby)) knight(row);
        else { const h = P.hobbies.find(x => x.name === row.dataset.hobby); readout.textContent = `> ${h.tag}: ${h.detail}`; SFX.tick(); }
    });
    main.addEventListener('keydown', e => {
        const row = e.target.closest && e.target.closest('tr.proc.clickable');
        if (row && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); knight(row); }
    });

    // ── boot ──
    const BOOT_LINES = [
        ['CHAMBER VACUUM', '4.2e-6 Torr'], ['PROPELLANT FLOW', '12 sccm Xe'], ['CATHODE HEATER', '1450 K'], ['DISCHARGE PSU', '28 V / 4.2 A'],
        ['SCREEN GRID HV', '+1500 V'], ['ACCEL GRID HV', '-250 V'], ['NEUTRALIZER', 'ON'], ['INTERLOCKS', 'CLEAR']
    ];
    const boot = $('boot'), bootLog = $('boot-log'), bootBtn = $('boot-btn');
    let bootRunning = false;
    function finishBoot() {
        if (booted) return; booted = true;
        boot.classList.add('gone');
        setTimeout(() => { try { $('boot-video').pause(); } catch (e) {} }, 800);
        document.dispatchEvent(new Event('tui:booted'));
        if (location.hash && $(location.hash.slice(1))) setTimeout(() => goto(location.hash.slice(1)), 50);
        setTimeout(revealVisible, 250);
    }
    async function runBoot() {
        if (bootRunning || booted) return; bootRunning = true;
        bootBtn.style.display = 'none'; $('boot-hint').style.display = 'none';
        bootLog.innerHTML = '';
        for (let i = 0; i < BOOT_LINES.length; i++) {
            const [k, v] = BOOT_LINES[i];
            bootLog.innerHTML += `<span class="dim">[${String(i + 1).padStart(2, '0')}/${BOOT_LINES.length}]</span> <span class="lbl">${k.padEnd(18)}</span>${'.'.repeat(Math.max(2, 22 - v.length))} <span class="ok">${v}</span>  <span class="ok">[ OK ]</span>\n`;
            SFX.tick();
            await sleep(reduced ? 0 : 120 + Math.random() * 90);
        }
        bootLog.innerHTML += `\n<span class="ign">&gt;&gt; IGNITION ARMED — WELCOME, OPERATOR.</span>`;
        SFX.thump();
        await sleep(reduced ? 0 : 800);
        try { sessionStorage.setItem('tui-booted', '1'); } catch (e) {}
        finishBoot();
    }
    bootBtn.addEventListener('click', runBoot);
    window.addEventListener('keydown', e => {
        if (booted) return;
        if (e.key === 'Enter') { e.preventDefault(); runBoot(); }
        else if (e.key.toLowerCase() === 's') finishBoot();
    });
    let seen = false; try { seen = sessionStorage.getItem('tui-booted') === '1'; } catch (e) {}
    if (seen) { boot.style.transition = 'none'; finishBoot(); }
    else bootBtn.focus({ preventScroll: true });

    // theme / crt persistence (per-visitor convenience)
    try {
        const t = localStorage.getItem('tui-theme'); if (t) document.documentElement.dataset.theme = t;
        if (localStorage.getItem('tui-crt') === 'off') document.body.classList.add('no-crt');
    } catch (e) {}

    return {
        SECTIONS: SECTIONS.map(s => s.id), goto, wall, wallHide, consoleOpen, knight,
        setTheme(t) { if (t === 'green') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t; try { localStorage.setItem('tui-theme', t === 'green' ? '' : t); } catch (e) {} },
        setCrt(on) { document.body.classList.toggle('no-crt', !on); try { localStorage.setItem('tui-crt', on ? 'on' : 'off'); } catch (e) {} },
        get booted() { return booted; }
    };
})();
