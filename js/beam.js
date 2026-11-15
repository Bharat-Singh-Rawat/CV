/* ═══════════════════════════════════════════════════════════════════
   ION SOURCE PANEL — a toy beamlet in a scope window.
   Multicusp chamber → screen/accel grids → drift → Faraday cup array.
   Toy model (illustrative, not a simulation):
     divergence α = 0.025 + 0.018·|V − 7| + 0.09·(1 − I/10)  [rad]
     current ∝ V^1.5 (Child–Langmuir scaling); ions with large angles strike the accel grid → wear.
   ═══════════════════════════════════════════════════════════════════ */
window.BEAM = (function () {
    const $ = id => document.getElementById(id);
    const cv = $('scope'), ctx = cv.getContext('2d');
    const pc = $('profile').getContext('2d'), ph = $('phase').getContext('2d');
    const vS = $('v-slider'), iS = $('i-slider');
    const W = cv.width, H = cv.height, CY = H / 2;
    const GRID_X = 92, CUP_X = W - 34, NCUP = 9, CUP_H = (H - 30) / NCUP;
    const WEAR_KEY = 'tui-grid-wear', IONS_KEY = 'tui-ions';
    const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

    let V = parseFloat(vS.value), I = parseFloat(iS.value);
    let firing = false, autoOff = null;
    let parts = [], electrons = [], sparks = [];
    const cups = new Array(NCUP).fill(0);
    let wearHits = 0, ions = 0;
    try { wearHits = parseFloat(localStorage.getItem(WEAR_KEY)) || 0; ions = parseInt(localStorage.getItem(IONS_KEY), 10) || 0; } catch (e) {}

    const alpha = () => 0.025 + 0.018 * Math.abs(V - 7) + 0.09 * (1 - I / 10);
    const wearPct = () => Math.min(100, wearHits / 40);                 // 4000 grid strikes = 100 %
    const randn = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

    // ── ASCII slider bars ──
    const bar = (el, frac) => { const n = 22, f = Math.round(frac * n); el.textContent = '[' + '█'.repeat(f) + '░'.repeat(n - f) + ']'; };
    function syncUI() {
        $('v-val').textContent = V.toFixed(1); $('i-val').textContent = I.toFixed(1);
        bar($('v-bar'), (V - 1) / 9); bar($('i-bar'), I / 10);
        $('div-val').textContent = (alpha() * 180 / Math.PI).toFixed(1) + '°';
        $('wear-pct').textContent = wearPct().toFixed(1); $('ions-tot').textContent = ions.toLocaleString();
        SFX.humSet(V);
    }
    vS.addEventListener('input', () => { V = parseFloat(vS.value); syncUI(); });
    iS.addEventListener('input', () => { I = parseFloat(iS.value); syncUI(); });

    // ── firing controls: hold the button, hold on the scope, or Space on the button ──
    function fire(on, autoMs) {
        clearTimeout(autoOff);
        if (on === firing) { if (on && autoMs) autoOff = setTimeout(() => fire(false), autoMs); return; }
        firing = on;
        $('fire-btn').classList.toggle('pressed', on);
        const st = $('ion-state'); st.textContent = on ? '▲ firing' : '● active'; st.classList.toggle('hot', on);
        if (on) { SFX.humStart(); SFX.humSet(V); if (autoMs) autoOff = setTimeout(() => fire(false), autoMs); }
        else { SFX.humStop(); save(); }
    }
    const hold = el => {
        el.addEventListener('pointerdown', e => { e.preventDefault(); el.setPointerCapture?.(e.pointerId); fire(true); });
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => el.addEventListener(t, () => fire(false)));
    };
    hold($('fire-btn')); hold(cv);
    $('fire-btn').addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); fire(true); } });
    $('fire-btn').addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') fire(false); });
    $('fire-btn').addEventListener('click', e => e.preventDefault());

    function save() { try { localStorage.setItem(WEAR_KEY, String(wearHits)); localStorage.setItem(IONS_KEY, String(ions)); } catch (e) {} }
    function reset() { wearHits = 0; ions = 0; cups.fill(0); sparks = []; save(); syncUI(); }
    $('reset-chamber-btn').addEventListener('click', () => { reset(); window.TUI?.wall?.('Chamber vented and re-pumped. Accel grid replaced — GRID_WEAR 0.0 %.', 3000); });

    // ── simulation step ──
    let lastSave = 0;
    function step() {
        const a = alpha();
        if (firing) {
            const rate = 1 + 0.35 * Math.pow(V, 1.5);
            for (let k = 0; k < rate; k++) {
                const ang = randn() * a;
                if (Math.abs(ang) > 0.11 && Math.random() < 0.7) {        // over-focused / under-focused ions strike the accel grid
                    wearHits += 1;
                    if (Math.random() < 0.25) sparks.push({ x: GRID_X + 8, y: CY + Math.sign(ang) * (14 - Math.min(6, wearPct() / 15)), life: 14 });
                    continue;
                }
                parts.push({ x: GRID_X + 10, y: CY + randn() * 2.5, vx: 3 + 0.45 * Math.sqrt(V) * 2, vy: 0, ang });
            }
            if (I > 0 && Math.random() < I / 12) electrons.push({ x: 130 + Math.random() * 40, y: H - 22, vx: (Math.random() - 0.2) * 1.2, vy: -1.2 - Math.random() * 1.5, life: 70 });
        }
        for (const p of parts) { p.vy = p.ang * p.vx; p.x += p.vx; p.y += p.vy; }
        parts = parts.filter(p => {
            if (p.x >= CUP_X) {
                const idx = Math.floor((p.y - 15) / CUP_H);
                if (idx >= 0 && idx < NCUP) { cups[idx] += 1; ions += 1; }
                return false;
            }
            return p.y > 2 && p.y < H - 2;
        });
        for (const e of electrons) { e.x += e.vx; e.y += e.vy; e.vy += (CY - e.y) * 0.002; e.life--; }
        electrons = electrons.filter(e => e.life > 0);
        for (let i = 0; i < NCUP; i++) cups[i] *= 0.985;
        sparks.forEach(s => s.life--); sparks = sparks.filter(s => s.life > 0);
        const t = performance.now();
        if (firing && t - lastSave > 2000) { save(); lastSave = t; }
    }

    // ── drawing ──
    function draw() {
        const acc = css('--accent') || '#39ff88', acc2 = css('--accent-2') || '#00e5ff', amb = css('--amber') || '#ffb000', fg = css('--fg') || '#cfe';
        ctx.clearRect(0, 0, W, H);
        // faint grid
        ctx.strokeStyle = 'rgba(120,255,180,0.05)'; ctx.lineWidth = 1;
        for (let x = 0; x < W; x += 28) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 0; y < H; y += 28) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
        // chamber + cusp magnets
        ctx.strokeStyle = 'rgba(160,200,190,0.45)'; ctx.strokeRect(10, 28, GRID_X - 12, H - 56);
        for (let i = 0; i < 4; i++) {
            const x = 16 + i * 18;
            ctx.fillStyle = i % 2 ? '#3e66ff' : '#ff3e3e'; ctx.fillRect(x, 20, 12, 7); ctx.fillRect(x, H - 27, 12, 7);
        }
        // plasma glow (brighter with V, hue shifts with neutralizer)
        const flick = 0.85 + Math.random() * 0.15;
        const g = ctx.createRadialGradient(GRID_X - 40, CY, 4, GRID_X - 40, CY, 50);
        g.addColorStop(0, `hsla(${275 - I * 7.5}, 100%, 70%, ${(0.35 + V * 0.05) * flick})`); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(12, 30, GRID_X - 14, H - 60);
        // grids (accel aperture widens with wear)
        const ap = 6 + wearPct() / 12;
        ctx.fillStyle = 'rgba(200,210,220,0.75)';
        ctx.fillRect(GRID_X, 28, 3, CY - 5 - 28); ctx.fillRect(GRID_X, CY + 5, 3, H - 28 - CY - 5);              // screen
        ctx.fillStyle = `rgba(200,${210 - wearPct()}, ${220 - wearPct() * 1.6}, 0.75)`;
        ctx.fillRect(GRID_X + 8, 28, 3, CY - ap - 28); ctx.fillRect(GRID_X + 8, CY + ap, 3, H - 28 - CY - ap);    // accel
        // neutralizer filament
        ctx.fillStyle = I > 0 ? `rgb(255, ${180 + I * 7}, 50)` : '#333';
        if (I > 0) { ctx.shadowColor = amb; ctx.shadowBlur = I * 2; }
        ctx.fillRect(128, H - 18, 46, 4); ctx.shadowBlur = 0;
        // beam ions
        ctx.fillStyle = acc2;
        for (const p of parts) ctx.fillRect(p.x, p.y, 2, 2);
        ctx.fillStyle = '#fff176';
        for (const e of electrons) ctx.fillRect(e.x, e.y, 1.5, 1.5);
        // sparks on accel grid
        for (const s of sparks) { ctx.fillStyle = `rgba(255,140,40,${s.life / 14})`; ctx.beginPath(); ctx.arc(s.x, s.y, 2 + (14 - s.life) * 0.3, 0, 7); ctx.fill(); }
        // Faraday cup array
        const peak = Math.max(1, ...cups);
        for (let i = 0; i < NCUP; i++) {
            const y = 15 + i * CUP_H, lvl = cups[i] / peak;
            ctx.strokeStyle = 'rgba(160,200,190,0.5)'; ctx.strokeRect(CUP_X, y + 1, 22, CUP_H - 3);
            ctx.fillStyle = acc; ctx.globalAlpha = 0.15 + 0.85 * lvl; ctx.fillRect(CUP_X + 2, y + 3, 18 * lvl, CUP_H - 7); ctx.globalAlpha = 1;
        }
        // labels
        ctx.fillStyle = 'rgba(200,230,215,0.55)'; ctx.font = '10px JetBrains Mono, monospace';
        ctx.fillText('ION SOURCE', 12, 14); ctx.fillText('GRIDS', GRID_X - 10, H - 6); ctx.fillText('NEUTRALIZER', 124, H - 4);
        ctx.fillText('FC ARRAY', CUP_X - 30, 12);
        if (!firing && parts.length === 0) { ctx.fillStyle = 'rgba(200,230,215,0.35)'; ctx.fillText('hold FIRE to extract a beam', 150, CY - 34); }

        // beam profile (cup currents, normalised) + gaussian fit
        const pw = pc.canvas.width, phh = pc.canvas.height;
        pc.clearRect(0, 0, pw, phh);
        pc.fillStyle = 'rgba(200,230,215,0.55)'; pc.font = '9px JetBrains Mono, monospace'; pc.fillText('BEAM PROFILE', 6, 11);
        const bw = (pw - 20) / NCUP;
        for (let i = 0; i < NCUP; i++) { const h = (cups[i] / peak) * (phh - 22); pc.fillStyle = acc; pc.globalAlpha = 0.55; pc.fillRect(10 + i * bw + 1, phh - 4 - h, bw - 2, h); }
        pc.globalAlpha = 1; pc.strokeStyle = amb; pc.beginPath();
        const sig = Math.max(0.6, (alpha() * (CUP_X - GRID_X)) / CUP_H);   // σ in cup units
        for (let x = 0; x <= pw - 20; x++) { const u = (x / (pw - 20)) * NCUP - NCUP / 2; const y = phh - 4 - Math.exp(-u * u / (2 * sig * sig)) * (phh - 22) * (cups.some(c => c > 0.5) ? 1 : 0.25); x ? pc.lineTo(10 + x, y) : pc.moveTo(10, y); }
        pc.stroke();

        // phase space (x, x') — ellipse grows and tilts with divergence
        const qw = ph.canvas.width, qh = ph.canvas.height;
        ph.clearRect(0, 0, qw, qh);
        ph.fillStyle = 'rgba(200,230,215,0.55)'; ph.font = '9px JetBrains Mono, monospace'; ph.fillText("PHASE SPACE  x–x'", 6, 11);
        ph.strokeStyle = 'rgba(200,230,215,0.15)'; ph.beginPath(); ph.moveTo(qw / 2, 14); ph.lineTo(qw / 2, qh - 2); ph.moveTo(6, qh / 2 + 6); ph.lineTo(qw - 6, qh / 2 + 6); ph.stroke();
        ph.strokeStyle = acc2; ph.lineWidth = 1.5; ph.beginPath();
        ph.ellipse(qw / 2, qh / 2 + 6, 14 + alpha() * 200, 5 + alpha() * 50, -0.35 - alpha() * 2, 0, Math.PI * 2); ph.stroke(); ph.lineWidth = 1;
        if (firing) { ph.fillStyle = acc2; for (let k = 0; k < 40; k++) { const t = Math.random() * 6.283, r = Math.sqrt(Math.random()); const ex = (14 + alpha() * 200) * r * Math.cos(t), ey = (5 + alpha() * 50) * r * Math.sin(t), rot = -0.35 - alpha() * 2; ph.fillRect(qw / 2 + ex * Math.cos(rot) - ey * Math.sin(rot), qh / 2 + 6 + ex * Math.sin(rot) + ey * Math.cos(rot), 1.5, 1.5); } }
    }

    function loop() { if (!document.hidden) { step(); draw(); if (firing) syncUI(); } requestAnimationFrame(loop); }
    syncUI(); requestAnimationFrame(loop);
    window.addEventListener('pagehide', save);

    return {
        get firing() { return firing; }, fire,
        get V() { return V; }, get I() { return I; },
        setV(kv) { vS.value = kv; vS.dispatchEvent(new Event('input')); },
        setI(mA) { iS.value = mA; iS.dispatchEvent(new Event('input')); },
        get wear() { return wearPct(); }, get ions() { return ions; },
        get divergenceDeg() { return alpha() * 180 / Math.PI; }, reset
    };
})();
