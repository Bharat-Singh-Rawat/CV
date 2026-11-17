/* =====================================================================
   Retro corner: Bio Menace (Apogee, 1993; freeware since December 2005), played in the
   browser with js-dos (DOSBox compiled to WebAssembly).
   - The card sits under the hobby cards in "Beyond the lab".
   - Nothing heavy loads until Play is pressed: js-dos (pinned 8.5.2) and the game bundle
     (games/biomenace.jsdos, all files as released by Apogee + a dosbox.conf) download then.
   - Esc belongs to the game (its menu), so the window closes only with ✕ or a click outside.
   ===================================================================== */
(function () {
    const T = window.T || (s => s);
    const JSDOS = 'https://cdn.jsdelivr.net/npm/js-dos@8.5.2/dist/';
    const BUNDLE = '/CV/v2/games/biomenace.jsdos';
    const host = document.getElementById('hobbies');
    if (!host) return;
    const touchOnly = matchMedia('(hover: none) and (pointer: coarse)').matches;

    // ---------- card ----------
    const card = document.createElement('div');
    card.className = 'play-card retro-card';
    card.innerHTML = `
        <div class="retro-screen" aria-hidden="true"><span>C:\\&gt; BMENACE<i>_</i></span></div>
        <div class="play-text">
            <h3>${T('Retro corner.')}</h3>
            <p>${T('Bio Menace (1993), a classic Apogee DOS platformer, running right here in your browser.')}
               <span class="retro-note">${touchOnly ? T('Best played on a computer with a keyboard.') : T('Arrow keys to move · press F1 in the game for all controls.')}</span></p>
        </div>
        <button type="button" class="btn play-btn retro-btn">${T('Play')} ▸</button>`;
    host.insertAdjacentElement('afterend', card);

    // ---------- the library (its own page: /CV/library/) ----------
    const lib = document.createElement('div');
    lib.className = 'play-card lib-card';
    lib.innerHTML = `
        <div class="lib-shelf" aria-hidden="true">${['#7c2128', '#1f3a7a', '#2f4a33', '#c9a24a', '#4f0d12', '#2b3a8c', '#795d46'].map((c, i) => `<i style="background:${c};height:${[44, 50, 40, 47, 52, 42, 48][i]}px"></i>`).join('')}</div>
        <div class="play-text">
            <h3>${T('The library.')}</h3>
            <p>${T('Books that shaped how I think about physics. Walk the shelves and pull one out.')}</p>
        </div>
        <a class="btn play-btn" href="/CV/library/" target="_blank" rel="noopener">${T('Step inside')} ↗</a>`;
    card.insertAdjacentElement('afterend', lib);


    // ---------- window ----------
    const ov = document.createElement('div');
    ov.className = 'game-ov retro-ov'; ov.hidden = true;
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Bio Menace');
    ov.innerHTML = `
        <div class="game-box retro-box">
            <div class="game-top">
                <strong>Bio Menace</strong>
                <span class="retro-hint">${T('Pick an episode: 1, 2 or 3 · F1 for help · Esc for the game menu')}</span>
                <button type="button" class="game-close" aria-label="${T('Close')}">✕</button>
            </div>
            <div class="retro-stage"><div class="retro-load">${T('Loading DOS…')}</div></div>
            <p class="game-help retro-credit">Bio Menace © 1993 Apogee Software · ${T('freeware release (2005)')} · ${T('emulated with')} <a href="https://js-dos.com" target="_blank" rel="noopener">js-dos</a></p>
        </div>`;
    document.body.appendChild(ov);
    const stage = ov.querySelector('.retro-stage');

    let libReady = null, dos = null, lastFocus = null, musicWasOn = false;
    function loadLib() {
        if (libReady) return libReady;
        libReady = new Promise((res, rej) => {
            const css = document.createElement('link');
            css.rel = 'stylesheet'; css.href = JSDOS + 'js-dos.css';
            document.head.appendChild(css);
            const s = document.createElement('script');
            s.src = JSDOS + 'js-dos.js'; s.async = true;
            s.onload = () => (window.Dos ? res() : rej(new Error('js-dos missing')));
            s.onerror = () => rej(new Error('js-dos failed to load'));
            document.head.appendChild(s);
        });
        libReady.catch(() => { libReady = null; });
        return libReady;
    }

    async function openGame() {
        lastFocus = document.activeElement;
        ov.hidden = false; requestAnimationFrame(() => ov.classList.add('open'));
        document.documentElement.classList.add('game-open');
        if (window.cvMusic && window.cvMusic.isPlaying()) { musicWasOn = true; window.cvMusic.pause(); }
        ov.querySelector('.game-close').focus();
        try {
            await loadLib();
            if (!ov.classList.contains('open')) return;           // closed while loading
            stage.innerHTML = '';
            const el = document.createElement('div');
            el.className = 'retro-dos';
            stage.appendChild(el);
            dos = window.Dos(el, {
                url: BUNDLE,
                pathPrefix: JSDOS + 'emulators/',
                autoStart: true,
                kiosk: true,                                        // no js-dos sidebar: just the game
                noCloud: true,
                mouseCapture: false,
                renderAspect: '4/3',
                theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
            });
        } catch (e) {
            stage.innerHTML = `<div class="retro-load">${T('Could not load the emulator. Please check your connection and try again.')}</div>`;
        }
    }
    function close() {
        try { dos && dos.stop && dos.stop(); } catch (e) { /* already stopped */ }
        dos = null;
        stage.innerHTML = `<div class="retro-load">${T('Loading DOS…')}</div>`;
        ov.classList.remove('open'); document.documentElement.classList.remove('game-open');
        setTimeout(() => { ov.hidden = true; }, 300);
        if (musicWasOn && window.cvMusic) { musicWasOn = false; }   // leave the player paused; the visitor can resume it
        lastFocus?.focus?.();
    }
    card.querySelector('.retro-btn').addEventListener('click', openGame);
    ov.querySelector('.game-close').addEventListener('click', close);
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    window.cvRetro = { open: openGame, close };
    // arriving through the library's secret passage (/CV/#retro)
    if (location.hash === '#retro') addEventListener('load', () => {
        card.scrollIntoView({ block: 'center' });
        card.classList.add('retro-flash');
        if (!touchOnly) openGame();
    });
})();
