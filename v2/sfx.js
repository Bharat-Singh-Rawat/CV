/* =====================================================================
   Subtle UI sounds ("quiet by design"), synthesised with Web Audio — no audio files.
   - click  : soft "tock" on buttons, links and cards
   - hover  : very faint "tick" on key items only, rate-limited
   - toggle : two-note chirp for menus / expanders / the player
   Android also gets a 10 ms vibration on taps (iPhone Safari has no vibration API).
   On by default; the speaker button in the top bar mutes it (remembered).
   Silent while music or a video plays, when the tab is hidden, and for reduced-motion users.
   ===================================================================== */
(function () {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const store = {
        get: () => { try { return localStorage.getItem('cv-sfx'); } catch (e) { return null; } },
        set: v => { try { localStorage.setItem('cv-sfx', v); } catch (e) { /* private mode */ } }
    };
    let enabled = !reduce && store.get() !== 'off';
    let ac = null, master = null;

    const HOVER = '.topnav a, .topbar-cta, .project, .tile, .vcard, .btn, .station-body, .talk, .offer, .round-btn, .more-btn, .mp button, #sfx-toggle';
    const TOGGLE = '#ln-toggle, .more-btn, #mp-fab, #mp-min, #mp-art, #mp-info, #sfx-toggle';
    const CLICK = 'a, button, .project, .vcard, [role="slider"]';

    function ensure() {                                   // browsers only allow audio after a user gesture
        if (ac) { if (ac.state === 'suspended') ac.resume(); return true; }
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        ac = new AC();
        master = ac.createGain(); master.gain.value = 0.8;   // overall volume
        const comp = ac.createDynamicsCompressor();       // keeps overlapping sounds from spiking
        master.connect(comp); comp.connect(ac.destination);
        return true;
    }
    const quiet = () => !enabled || !ac || document.hidden ||
        (window.cvMusic && window.cvMusic.isPlaying()) ||
        (document.getElementById('vmodal') && !document.getElementById('vmodal').hidden);
    const jitter = f => f * (0.96 + Math.random() * 0.08);   // never exactly the same twice

    function tone(freq, start, dur, peak, type = 'sine', glideTo) {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, start);
        if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, start + dur);
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(peak, start + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        o.connect(g); g.connect(master);
        o.start(start); o.stop(start + dur + 0.02);
    }
    function noiseTick(start, dur, peak, hp) {           // short filtered noise = the "physical" part of a click
        const n = Math.ceil(ac.sampleRate * dur), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 3;
        const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
        src.buffer = buf; f.type = 'highpass'; f.frequency.value = hp; g.gain.value = peak;
        src.connect(f); f.connect(g); g.connect(master); src.start(start);
    }

    const sfx = {
        click() { if (quiet()) return; const t = ac.currentTime; tone(jitter(620), t, 0.05, 0.16, 'sine', 260); noiseTick(t, 0.018, 0.07, 2500); },
        hover() { if (quiet()) return; const t = ac.currentTime; tone(jitter(2300), t, 0.018, 0.022, 'sine'); },
        toggle() { if (quiet()) return; const t = ac.currentTime; tone(jitter(880), t, 0.05, 0.08, 'triangle'); tone(jitter(1320), t + 0.045, 0.07, 0.07, 'triangle'); },
        // library room tone: a distant clock and the odd page turning, very quiet
        clock(tock) { if (quiet()) return; const t = ac.currentTime; noiseTick(t, 0.012, 0.035, tock ? 2200 : 3200); tone(tock ? 1850 : 2450, t, 0.02, 0.006, 'sine'); },
        rustle() {
            if (quiet()) return;
            const t = ac.currentTime, dur = 0.45 + Math.random() * 0.3, n = Math.ceil(ac.sampleRate * dur);
            const buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
            for (let i = 0; i < n; i++) { const u = i / n; d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * u) * (0.6 + 0.4 * Math.sin(u * 40 + Math.random())); }
            const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
            src.buffer = buf; f.type = 'bandpass'; f.frequency.value = 2600 + Math.random() * 1500; f.Q.value = 0.7; g.gain.value = 0.045;
            src.connect(f); f.connect(g); g.connect(master); src.start(t);
        }
    };

    // ---- hover: only key items, only when entering a new one, at most every 70 ms ----
    let lastHoverEl = null, lastHoverT = 0;
    if (fine) document.addEventListener('pointerover', e => {
        const el = e.target.closest(HOVER);
        if (!el || el === lastHoverEl) return;
        lastHoverEl = el;
        const now = performance.now();
        if (now - lastHoverT < 70) return;
        lastHoverT = now; sfx.hover();
    }, { passive: true });
    document.addEventListener('pointerout', e => { if (lastHoverEl && !lastHoverEl.contains(e.relatedTarget)) lastHoverEl = null; }, { passive: true });

    // ---- press: unlock audio, vibrate on Android, choose click vs toggle ----
    document.addEventListener('pointerdown', e => {
        if (!ensure()) return;
        const el = e.target.closest(CLICK);
        if (!el) return;
        if (e.pointerType === 'touch' && enabled && navigator.vibrate) navigator.vibrate(10);
        el.matches(TOGGLE) || el.closest(TOGGLE) ? sfx.toggle() : sfx.click();
    }, { passive: true });
    document.addEventListener('keydown', e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        if (document.documentElement.classList.contains('game-open')) return;   // keys belong to the game
        if (!ensure()) return;
        const el = document.activeElement && document.activeElement.closest(CLICK);
        if (el) (el.matches(TOGGLE) ? sfx.toggle : sfx.click)();
    });

    // ---- speaker toggle in the top bar ----
    const ICON_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
    const ICON_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M22 9l-6 6M16 9l6 6"/></svg>';
    const cta = document.getElementById('ln-cta');
    if (cta && !reduce) {
        const b = document.createElement('button');
        b.type = 'button'; b.id = 'sfx-toggle';
        const paint = () => {
            b.innerHTML = enabled ? ICON_ON : ICON_OFF;
            b.setAttribute('aria-pressed', String(enabled));
            b.setAttribute('aria-label', enabled ? 'Mute interface sounds' : 'Turn interface sounds on');
            b.title = enabled ? 'Sounds on' : 'Sounds off';
        };
        paint();
        b.addEventListener('click', () => {
            enabled = !enabled; store.set(enabled ? 'on' : 'off'); paint();
            if (enabled) { ensure(); sfx.toggle(); }
        });
        cta.parentNode.insertBefore(b, cta);
    }

    window.cvSfx = sfx;
})();
