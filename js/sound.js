/* ─── SOUND: key ticks, ignition thump, beam hum (Web Audio, no files) ─── */
window.SFX = (function () {
    let ctx = null, enabled = true, hum = null;
    const ac = () => {
        if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    };
    const blip = (freq, dur, gain, type = 'sine', toFreq) => {
        if (!enabled) return; const a = ac(); if (!a) return;
        const o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
        o.type = type; o.frequency.setValueAtTime(freq, t);
        if (toFreq) o.frequency.exponentialRampToValueAtTime(toFreq, t + dur);
        g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
    };
    return {
        get ctx() { return ac(); },
        get enabled() { return enabled; },
        set enabled(v) { enabled = !!v; if (!enabled) this.humStop(); },
        tick() { blip(1400 + Math.random() * 300, 0.03, 0.018); },
        key() { blip(900 + Math.random() * 500, 0.025, 0.012, 'square'); },
        thump() { blip(140, 0.6, 0.18, 'triangle', 40); },
        err() { blip(220, 0.18, 0.05, 'sawtooth', 110); },
        humStart() {
            if (!enabled || hum) return; const a = ac(); if (!a) return;
            const o = a.createOscillator(), g = a.createGain(), lfo = a.createOscillator(), lg = a.createGain();
            o.type = 'sawtooth'; o.frequency.value = 55; lfo.frequency.value = 6; lg.gain.value = 3;
            lfo.connect(lg); lg.connect(o.frequency);
            g.gain.setValueAtTime(0.0001, a.currentTime); g.gain.exponentialRampToValueAtTime(0.03, a.currentTime + 0.15);
            o.connect(g); g.connect(a.destination); o.start(); lfo.start();
            hum = { o, g, lfo };
        },
        humSet(kv) { if (hum) hum.o.frequency.setTargetAtTime(40 + kv * 9, ac().currentTime, 0.05); },
        humStop() {
            if (!hum) return; const a = ac(), h = hum; hum = null;
            h.g.gain.setTargetAtTime(0.0001, a.currentTime, 0.06);
            setTimeout(() => { try { h.o.stop(); h.lfo.stop(); } catch (e) {} }, 300);
        }
    };
})();
