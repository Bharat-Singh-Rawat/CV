/* ─── GUIDED TOUR: walks a visitor through the page (Esc or the button aborts) ─── */
(function () {
    const $ = id => document.getElementById(id);
    const btn = $('tour-btn');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let active = false, token = 0;
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const focusEl = el => { document.querySelectorAll('.tour-focus').forEach(x => x.classList.remove('tour-focus')); if (el) { el.classList.add('tour-focus'); el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }); } };
    const tween = async (setter, from, to, ms, t) => { const n = 24; for (let k = 1; k <= n; k++) { if (t !== token) return; setter(from + (to - from) * k / n); await sleep(ms / n); } };
    const typeCmd = async (txt, t) => {
        const inp = $('shell-input'); inp.value = '';
        for (const ch of txt) { if (t !== token) return; inp.value += ch; SFX.key(); await sleep(45); }
        inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    };

    async function run() {
        const t = ++token; active = true; btn.textContent = '■ STOP_TOUR';
        const ok = () => t === token;
        const steps = [
            async () => { TUI.goto('about'); focusEl($('about')); TUI.wall('Welcome, operator. This CV is a live terminal session: each section is a command and its output. The tabs in the green bar jump between them.', 0); await sleep(4200); },
            async () => { focusEl($('win-ion')); TUI.wall('ion-source.service — EXTRACTION_V sets the beam energy. Ramping to 9 kV…', 0); await sleep(900); await tween(v => BEAM.setV(v), BEAM.V, 9, 1400, t); await sleep(800); },
            async () => { TUI.wall('NEUTRALIZER_I adds electrons from a hot filament: space charge is compensated and the divergence drops.', 0); await tween(v => BEAM.setI(v), BEAM.I, 7, 1400, t); await sleep(900); },
            async () => { TUI.wall('Firing: ions cross the grids and land on a Faraday cup array. Badly matched beams sputter the accel grid — watch GRID_WEAR.', 0); BEAM.fire(true); await sleep(2800); BEAM.fire(false); await sleep(500); },
            async () => { TUI.goto('hobbies'); await sleep(700); focusEl($('hobbies')); TUI.wall('Hobbies run as processes. The ♟ chess process is interactive — it makes an L-jump.', 0); await sleep(1400); TUI.knight(document.querySelector('tr.proc.clickable')); await sleep(2000); },
            async () => { focusEl(null); TUI.consoleOpen(true); TUI.wall('Press ` any time for a real console. Try ls, cat, beam on, theme amber, play…', 0); await sleep(700); await typeCmd('neofetch', t); await sleep(1400); await typeCmd('cat experience/basilisk_industries.txt', t); await sleep(2600); },
            async () => { TUI.consoleOpen(false); TUI.goto('about'); TUI.wall('Tour complete. Enjoy the dossier.', 2500); await sleep(400); }
        ];
        for (const s of steps) { if (!ok()) return; await s(); }
        if (ok()) end();
    }
    function end() {
        token++; active = false; btn.textContent = '▶ GUIDED_TOUR';
        focusEl(null); BEAM.fire(false);
    }
    function abort() { if (!active) return; end(); TUI.wallHide(); TUI.consoleOpen(false); }

    btn.addEventListener('click', () => active ? abort() : run());
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && active) abort(); });
})();
