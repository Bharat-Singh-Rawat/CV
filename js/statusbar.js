/* ─── STATUS LINE (vim/tmux style) ─────────────────────────────────────
   Counts and messages come from window.PROFILE; beam values are read live from BEAM.
   The vacuum reading is decorative ambience.                                          */
(function () {
    const P = window.PROFILE;
    const bar = document.getElementById('status-bar');
    if (!P || !bar) return;
    const $ = id => document.getElementById(id);
    const strip = html => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent; };
    const now = P.experience[0];

    bar.innerHTML = `
        <span class="sb-mode" id="sb-mode">NORMAL</span>
        <span class="sb-item"><span class="sb-led" id="sb-led"></span>BEAM <b id="sb-beam">STANDBY</b></span>
        <span class="sb-item sb-hide-sm">V<sub>ext</sub> <b id="sb-v">5.0</b> kV</span>
        <span class="sb-item sb-hide-sm">INJECTOR <b class="sb-ok">${strip(now.org).split(',')[0].toUpperCase()}</b></span>
        <span class="sb-item sb-hide-md">PUBS <b>${P.publications.length}</b> · TALKS <b>${P.talks.length}</b></span>
        <span class="sb-item sb-hide-md">VAC <b id="sb-vac">4.7e-7</b> Torr</span>
        <span class="sb-ticker"><span id="sb-msg"></span></span>
        <span class="sb-item sb-hide-sm">♪ <b id="sb-song">—</b></span>
        <span class="sb-item sb-clock" id="sb-clock"></span>`;

    const msgs = [
        `Shift crew: ${strip(P.name)}`,
        `Now running: ${strip(now.role)} @ ${strip(now.org)}`,
        `Latest publication: ${strip(P.publications[0].venue)} — ${strip(P.publications[0].title)}`,
        `Latest talk: ${strip(P.talks[0].text)}`,
        `Core expertise: ${strip(P.expertise)}`,
        'Tip: press ` to open the console, then type help',
        'Tip: hold FIRE in the ion-source panel to extract a beam',
        'Tip: try `theme amber` or `theme ice` in the console',
        'All interlocks nominal ✓'
    ];
    let mi = 0;
    const msgEl = $('sb-msg');
    const showMsg = () => {
        msgEl.classList.remove('sb-msg-in'); void msgEl.offsetWidth;
        msgEl.textContent = '» ' + msgs[mi++ % msgs.length];
        msgEl.classList.add('sb-msg-in');
    };
    showMsg(); setInterval(showMsg, 6000);

    let vac = 4.7e-7;
    function tick() {
        const firing = window.BEAM && BEAM.firing;
        const consoleOpen = $('console').classList.contains('open');
        $('sb-mode').textContent = firing ? 'BEAM' : consoleOpen ? 'INSERT' : 'NORMAL';
        $('sb-beam').textContent = firing ? 'ON' : 'STANDBY';
        $('sb-beam').className = firing ? 'sb-warn' : 'sb-ok';
        $('sb-led').classList.toggle('on', !!firing);
        bar.classList.toggle('firing', !!firing);
        if (window.BEAM) $('sb-v').textContent = BEAM.V.toFixed(1);
        const target = firing ? 2.4e-6 : 4.7e-7;                      // gas load while firing, then pump-down
        vac += (target - vac) * 0.08 + (Math.random() - 0.5) * vac * 0.02;
        $('sb-vac').textContent = vac.toExponential(1);
        $('sb-song').textContent = window.PLAYER && PLAYER.playing ? PLAYER.track : '—';
        $('sb-clock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    tick(); setInterval(tick, 250);
})();
