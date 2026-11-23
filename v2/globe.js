/* =====================================================================
   Career globe: a dotted Earth pinned in the left column of "The beamline so far."
   As you scroll the career cards it flies to that stop (zooms out, turns, zooms back in
   to fit the cities), lights the pin and draws a beam-like arc from the previous stop.
   Talks given during that period appear as orange pins with dashed arcs.
   Data: PROFILE experience/education `place` and talks `place` ({ name, lat, lon }).
   Plain canvas 2D, no libraries. Land dots: globe-dots.js.
   ===================================================================== */
(() => {
    const DOTS = window.GLOBE_DOTS, P = window.PROFILE || {}, head = document.querySelector('#career .sec-head');
    const stations = [...document.querySelectorAll('#beamline .station')];
    if (!DOTS || !head || !stations.length) return;

    const R = Math.PI / 180;
    const ok = p => p && isFinite(p.lat) && isFinite(p.lon);
    const years = d => { const y = String(d).match(/\d{4}/g) || []; const a = +y[0] || 0; return [a, /present/i.test(d) ? 9999 : (+y[y.length - 1] || a)]; };

    const stops = stations.map(st => {
        let g = []; try { g = JSON.parse(st.dataset.geo || '[]'); } catch (e) { /* bad data: no pin */ }
        let tr = []; try { tr = JSON.parse(st.dataset.trips || '[]'); } catch (e) { /* no trips */ }
        return { places: g.filter(ok), talks: tr.filter(ok), dates: st.dataset.dates || '', span: years(st.dataset.dates || '') };
    });
    if (!stops.some(s => s.places.length)) return;
    // a stop without a place borrows the nearest newer one (list is newest first)
    stops.forEach((s, i) => { if (!s.places.length) { const n = stops.slice(0, i).reverse().find(x => x.places.length) || stops.find(x => x.places.length); s.places = n.places; s.borrowed = true; } });
    // talks join the stop whose years contain them (first match = newest role)
    (P.talks || []).forEach(t => {
        if (!ok(t.place)) return;
        const y = +((t.text || '').match(/\b(19|20)\d{2}\b/) || [])[0];
        const s = stops.filter(s => !s.borrowed && y >= s.span[0] && y <= s.span[1])      // longest role wins, so a short
            .sort((a, b) => (b.span[1] - b.span[0]) - (a.span[1] - a.span[0]))[0];          // internship doesn't take its talks
        if (s && !s.talks.some(p => p.name === t.place.name)) s.talks.push(t.place);
    });

    const vec = p => { const la = p.lat * R, lo = p.lon * R; return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)]; };
    const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const angle = (a, b) => Math.acos(Math.min(1, Math.max(-1, dot3(a, b)))) / R;
    function centroid(ps) {
        let x = 0, y = 0, z = 0; ps.forEach(p => { const v = vec(p); x += v[0]; y += v[1]; z += v[2]; });
        const m = Math.hypot(x, y, z) || 1; return { lat: Math.asin(y / m) / R, lon: Math.atan2(x, z) / R };
    }
    const ZMAX = 2.7;
    stops.forEach(s => {                                  // view that fits every city of the stop
        const all = s.places.concat(s.talks), c = centroid(all), cv = vec(c);
        const spread = Math.max(0, ...all.map(p => angle(cv, vec(p))));
        s.view = { lat: c.lat, lon: c.lon, zoom: spread < 1 ? ZMAX : Math.max(1, Math.min(ZMAX, 0.6 / Math.sin(Math.min(80, spread) * R))) };
    });

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const TT = s => (window.T ? window.T(s) : s);
    const TRAVEL = (P.travels || []).filter(ok);
    const box = document.createElement('div');
    box.className = 'globe';
    box.innerHTML = '<canvas aria-hidden="true"></canvas>' +
        (TRAVEL.length ? `<div class="globe-mode"><button type="button" data-mode="work" aria-pressed="true">${TT('Work')}</button><button type="button" data-mode="travel" aria-pressed="false">${TT('Travel')}</button></div>` : '') +
        '<p class="globe-label" aria-live="polite"><b></b><span class="gl-dates"></span><span class="gl-talks"></span></p>';
    head.appendChild(box);
    const bub = document.createElement('button');                 // Apple-Maps-style photo bubble beside the pin
    bub.type = 'button'; bub.className = 'globe-photo'; bub.hidden = true;
    bub.innerHTML = '<img alt=""><span class="gp-dots"></span>';
    box.insertBefore(bub, box.querySelector('.globe-mode') || box.querySelector('.globe-label'));
    const bubImg = bub.querySelector('img'), bubDots = bub.querySelector('.gp-dots');
    const cv = box.querySelector('canvas'), ctx = cv.getContext('2d');
    const lblName = box.querySelector('b'), lblDates = box.querySelector('.gl-dates'), lblTalks = box.querySelector('.gl-talks');

    // dot unit vectors
    const n = DOTS.length / 2;
    const vx = new Float32Array(n), vy = new Float32Array(n), vz = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        const la = DOTS[2 * i] * R, lo = DOTS[2 * i + 1] * R;
        vx[i] = Math.cos(la) * Math.sin(lo); vy[i] = Math.sin(la); vz[i] = Math.cos(la) * Math.cos(lo);
    }

    let dpr = 1, dirty = true, landKey = '';
    const landCv = document.createElement('canvas'), landCtx = landCv.getContext('2d');
    function resize() { dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = cv.height = Math.round(cv.clientWidth * dpr); dirty = true; }

    // view state
    let lon0 = 0, lat0 = 20, zoom = 1, active = -1, arcT = 1, arcFrom = null, arcTo = null, pulse = 0, talkT = 1;
    let tLon = 0, tLat = 20, tZoom = 1;
    let fly = null, inertia = null, arriveT = 1, near = [], badgeT = 1, talkEnd = 1;
    const TSTAG = 0.35;                                   // talk arcs launch one after another
    const easeIO = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const backOut = t => { const k = 1.7, u = t - 1; return 1 + (k + 1) * u * u * u + k * u * u; };
    let mode = 'work', hover = -1, travelPts = [], drag = null, spinPause = 0, mini = false;
    let shots = [], shotIdx = 0, shotKey = '', shotTimer = 0, unhover = 0, workHover = null, workPts = [];
    function currentShots() {
        if (mode === 'travel') { const t = TRAVEL[hover]; return t ? (t.photos || []).map(src => ({ src, place: t, title: t.name, text: t.note || '' })) : []; }
        const s = stops[active]; if (!s) return [];
        const pool = workHover && (workHover.photos || []).length ? [workHover] : s.places.concat(s.talks);   // hovered pin: only its photos
        return pool.flatMap(p => (p.photos || []).map(src => ({ src, place: p, title: p.name, text: s.talks.includes(p) ? TT('Talks') : s.dates })));
    }
    function showShot(i) {
        shotIdx = (i + shots.length) % shots.length;
        bub.classList.remove('loaded');
        const src = shots[shotIdx].src;
        const im = new Image(); im.onload = () => { if (shots[shotIdx]?.src === src) { bubImg.src = src; bub.classList.add('loaded'); } }; im.src = src;
        bubDots.innerHTML = shots.length > 1 ? shots.map((_, k) => `<i class="${k === shotIdx ? 'on' : ''}"></i>`).join('') : '';
        bub.setAttribute('aria-label', `${TT('Open photo')}: ${shots[shotIdx].title}`);
    }
    function syncShots() {                               // called every frame: changes only when the set of photos changes
        const list = currentShots(), key = list.map(x => x.src).join('|');
        if (key === shotKey) return;
        shotKey = key; shots = list; clearInterval(shotTimer);
        if (!shots.length) { bub.classList.remove('show'); return; }
        bub.hidden = false; showShot(0);
        if (shots.length > 1 && !reduce) shotTimer = setInterval(() => { if (visible && !bub.matches(':hover')) showShot(shotIdx + 1); }, 3200);
    }
    function placeBubble(at, settled) {                  // park the bubble next to its pin, inside the globe
        const sh = shots[shotIdx], q = sh && settled && !mini ? at(sh.place) : null;
        if (!q) { bub.classList.remove('show'); return; }
        const w = bub.offsetWidth || 128, h = bub.offsetHeight || 96, size = cv.clientWidth;
        const x = q[0] / dpr, y = q[1] / dpr;
        const lift = mode === 'work' ? 12 : 0;              // work pins stand on a stem: keep clear of the head and its label
        let left = x + 14, top = y - h - 10 - lift;
        if (left + w > size) left = x - w - 14;
        if (top < 0) top = y + 14;
        bub.style.transform = `translate(${Math.round(Math.max(0, Math.min(size - w, left)))}px, ${Math.round(Math.max(0, Math.min(size - h, top)))}px)`;
        bub.classList.add('show');
    }
    function travelLabel() {
        const t = TRAVEL[hover];
        lblName.textContent = t ? t.name : TT('Travels');
        lblDates.textContent = t ? (t.note || '') : TT('Drag to spin · hover a pin');
        lblTalks.textContent = t && t.cities ? t.cities.filter(ok).map(c => c.name).join(' · ') : '';
    }
    function setMode(m) {
        if (m === mode) return;
        mode = m; hover = -1;
        box.classList.toggle('travel', m === 'travel');
        box.querySelectorAll('.globe-mode button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
        if (m === 'travel') { tZoom = 1; tLat = 25; tLon = lon0; arcFrom = arcTo = null; fly = null; near = []; travelLabel(); }
        else { active = -1; pick(); }
        dirty = true; kick();
    }
    function setActive(i) {
        if (i === active) return;
        const prev = active; active = i; workHover = null;
        const s = stops[i];
        tLon = s.view.lon; tLat = Math.max(-40, Math.min(60, s.view.lat)); tZoom = s.view.zoom;
        lblName.textContent = [...new Set(s.places.map(p => p.name))].join(' · ');
        lblDates.textContent = s.borrowed ? '' : s.dates;
        lblTalks.textContent = s.talks.length ? (window.T ? window.T('Talks') : 'Talks') + ': ' + s.talks.map(p => p.name.split(',')[0] + (p.note ? ` (${TT(p.note)})` : '')).join(' · ') : '';
        const from = prev >= 0 ? stops[prev] : stops[i + 1];
        const a = from && centroid(from.places), b = centroid(s.places);
        if (a && Math.hypot(a.lat - b.lat, a.lon - b.lon) > 1.5) { arcFrom = vec(a); arcTo = vec(b); arcT = reduce ? 1 : 0; }
        else { arcFrom = arcTo = null; }
        talkEnd = s.talks.length ? 1 + (s.talks.length - 1) * TSTAG + 0.4 : 0;
        talkT = reduce ? 99 : 0;
        // dots around the new city, for the arrival ripple
        const cv0 = vec(centroid(s.places)), cmin = Math.cos(16 * R); near = [];
        for (let k = 0; k < n; k++) { const d = vx[k] * cv0[0] + vy[k] * cv0[1] + vz[k] * cv0[2]; if (d > cmin) near.push(k, Math.acos(Math.min(1, d)) / R); }
        if (reduce) { lon0 = tLon; lat0 = tLat; zoom = tZoom; fly = null; arriveT = 1; badgeT = 1; }
        else {                                          // timed flight: lift off, glide along the great circle, settle
            const d = angle(vec({ lat: lat0, lon: lon0 }), vec({ lat: tLat, lon: tLon }));
            fly = { lat: lat0, lon: lon0, zoom, d, t: 0, dur: 900 + Math.min(1100, d * 14) };
            arriveT = -1; badgeT = 0;
        }
        dirty = true; kick();
    }
    function pick() {                                   // the career card nearest the middle of the screen
        if (mode === 'travel') return;
        const mid = window.innerHeight * 0.5; let best = 0, bd = Infinity;
        stations.forEach((st, i) => { const r = st.getBoundingClientRect(); const d = Math.abs(r.top + Math.min(r.height, 260) / 2 - mid); if (d < bd) { bd = d; best = i; } });
        setActive(best);
    }

    // projection
    let sl, cl, sp, cp;
    function prep() { sl = Math.sin(lon0 * R); cl = Math.cos(lon0 * R); sp = Math.sin(lat0 * R); cp = Math.cos(lat0 * R); }
    function proj(x, y, z) {
        const x1 = x * cl - z * sl, z1 = x * sl + z * cl;
        return [x1, y * cp - z1 * sp, y * sp + z1 * cp];
    }
    function slerp(a, b, t) {
        const w = Math.acos(Math.min(1, Math.max(-1, dot3(a, b))));
        if (w < 1e-4) return a.slice();
        const s = Math.sin(w), k1 = Math.sin((1 - t) * w) / s, k2 = Math.sin(t * w) / s;
        return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
    }

    function arc(a, b, t, rgb, alpha, width, dash, c, rad, lens, comet) {
        const d = angle(a, b) * R, lift = Math.min(0.3, 0.04 + d * 0.16), steps = 64, end = Math.round(steps * Math.min(1, t));
        ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.setLineDash(dash);
        ctx.beginPath(); let pen = false, trail = [];
        for (let k = 0; k <= end; k++) {
            const u = k / steps, v = slerp(a, b, u), h = 1 + lift * Math.sin(Math.PI * u);
            const p = proj(v[0] * h, v[1] * h, v[2] * h);
            const vis = p[2] > 0 || Math.hypot(p[0], p[1]) * h > 1;
            const x = c + p[0] * rad, y = c - p[1] * rad;
            if (vis && Math.hypot(x - c, y - c) < lens) { pen ? ctx.lineTo(x, y) : (ctx.moveTo(x, y), trail = []); pen = true; trail.push([x, y]); } else pen = false;
        }
        ctx.strokeStyle = `rgba(${rgb},${alpha})`; ctx.stroke(); ctx.setLineDash([]);
        if (t >= 1 || !comet || !pen || trail.length < 2) return;
        // comet: a brighter, thicker tail that fades out behind a soft glowing head (like a beam bunch)
        const N = Math.min(trail.length - 1, 16), s0 = trail.length - 1 - N;
        for (let j = s0 + 1; j < trail.length; j++) {
            const f = (j - s0) / N;
            ctx.strokeStyle = `rgba(${rgb},${0.9 * f})`; ctx.lineWidth = width * (1 + 1.4 * f * comet);
            ctx.beginPath(); ctx.moveTo(...trail[j - 1]); ctx.lineTo(...trail[j]); ctx.stroke();
        }
        const [hx, hy] = trail[trail.length - 1], gr = 10 * dpr * comet;
        const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, gr);
        g.addColorStop(0, `rgba(${rgb},0.85)`); g.addColorStop(0.35, `rgba(${rgb},0.3)`); g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx, hy, gr, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hx, hy, 1.7 * dpr * comet, 0, 7); ctx.fill();
    }
    function edge(c, lens, rad, ink, dark) {           // lens rim; in dark mode a faint blue atmosphere while the whole globe shows
        const a = dark ? 0.3 * Math.max(0, 1 - (zoom - 1) * 1.6) : 0;
        if (a > 0.01) {
            const r = Math.min(rad, lens), g = ctx.createRadialGradient(c, c, r * 0.9, c, c, r * 1.06);
            g.addColorStop(0, 'rgba(41,151,255,0)'); g.addColorStop(0.6, `rgba(41,151,255,${a})`); g.addColorStop(1, 'rgba(41,151,255,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c, c, r * 1.06, 0, 7); ctx.fill();
        }
        ctx.strokeStyle = `rgba(${ink},0.12)`; ctx.lineWidth = dpr;
        ctx.beginPath(); ctx.arc(c, c, lens - dpr / 2, 0, 7); ctx.stroke();
        if (!mini) {                                     // soft contact shadow: the globe floats just above the page
            const sy = c + lens + cv.width * 0.014, sx = lens * 0.62, syr = cv.width * 0.013;
            ctx.save(); ctx.translate(c, sy); ctx.scale(1, syr / sx);
            const sh = ctx.createRadialGradient(0, 0, 0, 0, 0, sx);
            sh.addColorStop(0, `rgba(0,0,0,${dark ? 0.5 : 0.16})`); sh.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(0, 0, sx, 0, 7); ctx.fill(); ctx.restore();
        }
    }

    function label(text, x, y, color, W, bold, taken) {
        ctx.font = `${bold ? 600 : 500} ${Math.round(11.5 * dpr)}px -apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, 'Segoe UI', sans-serif`;
        const w = ctx.measureText(text).width, hgt = 14 * dpr;
        const fits = tx => !taken.some(r => tx < r[2] && tx + w > r[0] && y - hgt / 2 < r[3] && y + hgt / 2 > r[1]) && tx > 2 * dpr && tx + w < W - 2 * dpr;
        const tx = [x + 9 * dpr, x - 9 * dpr - w].find(fits);
        if (tx === undefined) return;                     // no free spot: the pin alone is enough
        taken.push([tx, y - hgt / 2, tx + w, y + hgt / 2]);
        ctx.lineWidth = 3 * dpr; ctx.strokeStyle = document.documentElement.dataset.theme === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.85)';
        ctx.strokeText(text, tx, y + 4 * dpr); ctx.fillStyle = color; ctx.fillText(text, tx, y + 4 * dpr);
    }

    function draw() {
        const dark = document.documentElement.dataset.theme === 'dark';
        const ink = dark ? '245,245,247' : '29,29,31', acc = dark ? '41,151,255' : '0,113,227', warm = dark ? '255,159,10' : '191,72,0';
        const W = cv.width, c = W / 2, lens = W * 0.47, rad = lens * zoom;
        ctx.clearRect(0, 0, W, W);
        prep();
        ctx.save();
        ctx.beginPath(); ctx.arc(c, c, lens, 0, 7); ctx.clip();      // the globe is seen through a round lens
        // sphere + land dots are cached: redrawn only when the view moves, not for every pulse frame
        const dr = Math.max(0.8, W / 420) * (0.75 + 0.35 * zoom) * (mini ? 1.5 : 1);
        const key = `${lon0.toFixed(2)},${lat0.toFixed(2)},${zoom.toFixed(3)},${W},${dark}`;
        if (key !== landKey) {
            landKey = key;
            if (landCv.width !== W) landCv.width = landCv.height = W;
            const L = landCtx;
            L.clearRect(0, 0, W, W);
            const g = L.createRadialGradient(c - rad * 0.35, c - rad * 0.4, rad * 0.1, c, c, rad);
            g.addColorStop(0, `rgba(${ink},${dark ? 0.07 : 0.035})`); g.addColorStop(1, `rgba(${ink},${dark ? 0.02 : 0.01})`);
            L.fillStyle = g; L.beginPath(); L.arc(c, c, rad, 0, 7); L.fill();
            if (zoom < 1.05) { L.strokeStyle = `rgba(${ink},0.1)`; L.lineWidth = dpr; L.stroke(); }
            const step = mini ? 3 : 1;                    // the small docked globe needs far fewer dots
            L.fillStyle = `rgb(${ink})`;
            for (let i = 0; i < n; i += step) {
                const p = proj(vx[i], vy[i], vz[i]); if (p[2] <= 0.02) continue;
                const x = c + p[0] * rad, y = c - p[1] * rad;
                if ((x - c) * (x - c) + (y - c) * (y - c) > lens * lens) continue;
                const sun = p[0] * -0.5 + p[1] * 0.42 + p[2] * 0.757;        // light from upper left: soft day / night
                const day = sun < -0.3 ? 0 : sun > 0.25 ? 1 : (sun + 0.3) / 0.55;
                L.globalAlpha = ((dark ? 0.12 : 0.14) + p[2] * (dark ? 0.55 : 0.56)) * (0.3 + 0.7 * day * day * (3 - 2 * day));
                const sz = dr * (0.5 + 0.65 * Math.sqrt(p[2]));          // dots shrink towards the rim: reads as a sphere
                L.fillRect(x - sz / 2, y - sz / 2, sz, sz);
            }
            L.globalAlpha = 1;
            if (!mini) {                                  // hairline latitude / longitude grid, bending with the curve
                L.lineWidth = 0.7 * dpr; L.strokeStyle = `rgba(${ink},${dark ? 0.09 : 0.07})`;
                const line = pts => {
                    L.beginPath(); let pen = false;
                    pts.forEach(([la, lo]) => {
                        const v = vec({ lat: la, lon: lo }), p = proj(v[0], v[1], v[2]);
                        if (p[2] > 0) { const x = c + p[0] * rad, y = c - p[1] * rad; pen ? L.lineTo(x, y) : L.moveTo(x, y); pen = true; } else pen = false;
                    });
                    L.stroke();
                };
                for (let la = -60; la <= 60; la += 30) line(Array.from({ length: 121 }, (_, k) => [la, -180 + k * 3]));
                for (let lo = -180; lo < 180; lo += 30) line(Array.from({ length: 61 }, (_, k) => [-90 + k * 3, lo]));
            }
            // glossy highlight top-left and a soft darker rim: light on a marble
            const r = Math.min(rad, lens * 1.15);
            const gl = L.createRadialGradient(c - r * 0.4, c - r * 0.46, 0, c - r * 0.4, c - r * 0.46, r * 0.75);
            gl.addColorStop(0, `rgba(255,255,255,${dark ? 0.07 : 0.55})`); gl.addColorStop(1, 'rgba(255,255,255,0)');
            L.fillStyle = gl; L.beginPath(); L.arc(c, c, rad, 0, 7); L.fill();
            if (!dark) {
                const lm = L.createRadialGradient(c, c, rad * 0.78, c, c, rad);
                lm.addColorStop(0, 'rgba(0,0,0,0)'); lm.addColorStop(1, 'rgba(0,0,0,0.05)');
                L.fillStyle = lm; L.beginPath(); L.arc(c, c, rad, 0, 7); L.fill();
            }
        }
        ctx.drawImage(landCv, 0, 0);
        const at = pl => { const p = proj(...vec(pl)); if (p[2] <= 0) return null; const x = c + p[0] * rad, y = c - p[1] * rad; return Math.hypot(x - c, y - c) < lens ? [x, y] : null; };
        if (mode === 'travel') {                          // every place visited: work + talks faint, travels bright
            const green = dark ? '48,209,88' : '36,138,61', seenT = new Set();
            stops.forEach(o => o.places.concat(o.talks).forEach(pl => {
                const k = pl.lat + ',' + pl.lon; if (seenT.has(k)) return; seenT.add(k);
                const q = at(pl); if (!q) return;
                ctx.fillStyle = `rgba(${ink},0.32)`; ctx.beginPath(); ctx.arc(q[0], q[1], 2.4 * dpr, 0, 7); ctx.fill();
            }));
            travelPts = []; const tl = [];
            TRAVEL.forEach(t => (t.cities || []).filter(ok).forEach(cy => {   // cities visited inside one country pin
                const q = at(cy); if (!q) return;
                ctx.fillStyle = `rgba(${green},0.75)`; ctx.beginPath(); ctx.arc(q[0], q[1], 1.9 * dpr, 0, 7); ctx.fill();
            }));
            TRAVEL.forEach((t, i) => {
                const q = at(t); if (!q) return;
                travelPts.push([q[0], q[1], i]);
                const on = i === hover;
                ctx.fillStyle = `rgb(${green})`; ctx.beginPath(); ctx.arc(q[0], q[1], (on ? 5.2 : 3.8) * dpr, 0, 7); ctx.fill();
                ctx.strokeStyle = `rgba(${green},${on ? 0.5 : 0.25})`; ctx.lineWidth = 1.5 * dpr;
                ctx.beginPath(); ctx.arc(q[0], q[1], (on ? 10 : 7) * dpr, 0, 7); ctx.stroke();
                tl.push([t.name.split(',')[0], q, on ? `rgb(${green})` : `rgb(${ink})`, on]);
            });
            tl.sort((a, b) => b[3] - a[3]);                 // hovered label always wins its spot
            const taken = tl.map(([, q]) => [q[0] - 5 * dpr, q[1] - 5 * dpr, q[0] + 5 * dpr, q[1] + 5 * dpr]);
            tl.forEach(([t, q, col, b]) => label(t, q[0], q[1], col, W, b, taken));
            syncShots(); placeBubble(at, hover >= 0);
            ctx.restore();
            edge(c, lens, rad, ink, dark);
            return;
        }
        // faint pins for every other stop
        const seen = new Set(), s = stops[active] || stops[0];
        stops.forEach((o, i) => i !== active && o.places.forEach(pl => {
            const k = pl.lat + ',' + pl.lon; if (seen.has(k)) return; seen.add(k);
            const q = at(pl); if (!q) return;
            ctx.fillStyle = `rgba(${ink},0.3)`; ctx.beginPath(); ctx.arc(q[0], q[1], 2.4 * dpr, 0, 7); ctx.fill();
        }));
        // arrival: a ripple runs out through the land dots, and the dots around the city stay raised
        if (near.length && arriveT >= 0) {
            const front = arriveT * 15, fade = 1 - arriveT, grow = Math.min(1, arriveT * 3);
            for (let j = 0; j < near.length; j += 2) {
                const k = near[j], a = near[j + 1];
                const b = Math.max(Math.exp(-(((a - front) / 1.4) ** 2)) * fade * 0.9, Math.max(0, 1 - a / 4) * grow * 0.6);
                if (b < 0.04) continue;
                const p = proj(vx[k], vy[k], vz[k]); if (p[2] <= 0.02) continue;
                const x = c + p[0] * rad, y = c - p[1] * rad;
                if ((x - c) * (x - c) + (y - c) * (y - c) > lens * lens) continue;
                const sz = dr * (1 + 1.2 * b);
                ctx.fillStyle = `rgba(${acc},${(0.15 + 0.6 * b).toFixed(3)})`; ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
            }
        }
        // travel arc from the previous stop, drawn as a beam with a comet head
        if (arcFrom && arcT > 0) arc(arcFrom, arcTo, arcT, acc, 0.85, 2 * dpr, [], c, rad, lens, 1);
        // talks: dashed arcs out from base, orange rings
        const base = vec(centroid(s.places)), labels = [], talkLabels = [];
        workPts = [];
        s.talks.forEach((tp, ti) => {
            const tt = Math.max(0, Math.min(1, talkT - ti * TSTAG));
            if (tt > 0) arc(base, vec(tp), tt, warm, 0.75, 1.4 * dpr, [3 * dpr, 4 * dpr], c, rad, lens, 0.7);
            const q = at(tp); if (!q || tt < 1) return;
            const pop = backOut(Math.min(1, (talkT - ti * TSTAG - 1) / 0.4));   // ring pops in when its arc lands
            ctx.strokeStyle = `rgb(${warm})`; ctx.lineWidth = 1.8 * dpr; ctx.fillStyle = dark ? '#000' : '#fff';
            ctx.beginPath(); ctx.arc(q[0], q[1], Math.max(0.1, (tp === workHover ? 5 : 3.6) * dpr * pop), 0, 7); ctx.fill(); ctx.stroke();
            workPts.push([q[0], q[1], tp]);
            talkLabels.push([tp.name.split(',')[0], q, `rgb(${warm})`, false]);
        });
        // active stop: bright pins with a pulse
        const done = new Set();
        s.places.forEach(pl => {
            const q = at(pl); if (!q) return;
            const p = proj(...vec(pl)), tilt = Math.max(0.25, p[2]), rot = Math.atan2(q[1] - c, q[0] - c);
            const ring = (r0, st) => { ctx.beginPath(); ctx.ellipse(q[0], q[1], r0, r0 * tilt, rot, 0, 7); st ? ctx.stroke() : ctx.fill(); };
            const k = pulse % 1;                          // pulse ring lies on the ground, foreshortened by the curve
            ctx.strokeStyle = `rgba(${acc},${0.55 * (1 - k)})`; ctx.lineWidth = 1.5 * dpr; ring((5 + k * 14) * dpr, true);
            ctx.fillStyle = 'rgba(0,0,0,0.22)'; ring(3.2 * dpr, false);            // contact shadow
            const hgt = (mini ? 6 : 11) * dpr * Math.min(1, arcT * 1.2), hx = q[0], hy = q[1] - hgt, hr = (pl === workHover ? 5.4 : 4.4) * dpr;
            ctx.strokeStyle = `rgb(${acc})`; ctx.lineWidth = 1.6 * dpr; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(hx, hy); ctx.stroke();      // stem
            const hg = ctx.createRadialGradient(hx - hr * 0.35, hy - hr * 0.4, hr * 0.1, hx, hy, hr);   // shaded pin head
            hg.addColorStop(0, dark ? '#8cc8ff' : '#5aa9ff'); hg.addColorStop(1, `rgb(${acc})`);
            ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(hx, hy, hr, 0, 7); ctx.fill();
            workPts.push([hx, hy, pl]);
            const nm = pl.name.split(',')[0]; if (!done.has(nm)) { done.add(nm); labels.push([nm, [hx, hy], `rgb(${ink})`, true]); }
        });
        // year badge: a small pill under the city, fades up once the globe has landed
        let pill = null;
        const bq = !mini && !s.borrowed && badgeT > 0 && s.span[0] ? at(s.places[0]) : null;
        if (bq) {
            const [y0, y1] = s.span, txt = y1 === 9999 ? `${y0} →` : y1 === y0 ? `${y0}` : `${y0} – ${y1}`;
            ctx.font = `600 ${Math.round(10.5 * dpr)}px -apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, 'Segoe UI', sans-serif`;
            const e = easeIO(badgeT), tw = ctx.measureText(txt).width, pw = tw + 14 * dpr, ph = 18 * dpr;
            const px = Math.max(3 * dpr, Math.min(W - pw - 3 * dpr, bq[0] - pw / 2)), py = bq[1] + 13 * dpr + (1 - e) * 6 * dpr;
            pill = [px, py, px + pw, py + ph];
            ctx.globalAlpha = e;
            ctx.fillStyle = dark ? 'rgba(44,44,46,0.92)' : 'rgba(255,255,255,0.94)';
            ctx.strokeStyle = `rgba(${ink},${dark ? 0.18 : 0.1})`; ctx.lineWidth = dpr;
            ctx.beginPath(); ctx.roundRect ? ctx.roundRect(px, py, pw, ph, ph / 2) : ctx.rect(px, py, pw, ph); ctx.fill(); ctx.stroke();
            ctx.fillStyle = `rgb(${ink})`; ctx.textAlign = 'center'; ctx.fillText(txt, px + pw / 2, py + ph / 2 + 3.6 * dpr); ctx.textAlign = 'start';
            ctx.globalAlpha = 1;
        }
        if (zoom > 1.6) {                                 // main cities first, then talks where there is room
            const taken = labels.concat(talkLabels).map(([, q]) => [q[0] - 5 * dpr, q[1] - 5 * dpr, q[0] + 5 * dpr, q[1] + 5 * dpr]);
            if (pill) taken.push(pill);
            labels.concat(talkLabels).forEach(([t, q, col, b]) => label(t, q[0], q[1], col, W, b, taken));
        }
        syncShots(); placeBubble(at, arcT >= 1 && Math.abs(zoom - tZoom) < 0.08);
        ctx.restore();
        edge(c, lens, rad, ink, dark);
    }

    // animation: fly-to (zoom out while turning, zoom back in on arrival); runs only on screen
    let running = false, visible = false, lastT = 0;
    function frame(now) {
        const dt = Math.min(64, now - (lastT || now)); lastT = now;
        const e = 1 - Math.exp(-dt / 380);
        if (inertia && !drag) {                          // a flicked globe keeps rolling and slows down
            tLon += inertia.vl * dt; tLat = Math.max(-60, Math.min(70, tLat + inertia.va * dt));
            lon0 = tLon; lat0 = tLat;
            const k = Math.exp(-dt / 600); inertia.vl *= k; inertia.va *= k;
            if (Math.abs(inertia.vl) + Math.abs(inertia.va) < 0.003) { inertia = null; spinPause = now + 1500; }
        }
        if (mode === 'travel' && !drag && !inertia && !reduce && hover < 0 && now > spinPause) tLon -= dt * 0.006;   // slow spin
        let want = tZoom;
        if (fly && mode === 'work') {                   // timed flight between career stops
            fly.t = Math.min(1, fly.t + dt / fly.dur);
            const u = easeIO(fly.t), v = slerp(vec(fly), vec({ lat: tLat, lon: tLon }), u);
            lat0 = Math.asin(Math.max(-1, Math.min(1, v[1]))) / R; lon0 = Math.atan2(v[0], v[2]) / R;
            const lin = fly.zoom + (tZoom - fly.zoom) * u;
            const peak = Math.min(lin, 1 + (Math.min(fly.zoom, tZoom) - 1) * Math.exp(-fly.d / 18));   // lift off: see more of the globe
            const land = fly.t > 0.78 ? Math.sin(Math.PI * (fly.t - 0.78) / 0.22) * 0.04 : 0;           // small push-in as it settles
            zoom = (lin + (peak - lin) * Math.sin(Math.PI * fly.t)) * (1 + land);
            if (fly.t >= 1) { fly = null; lon0 = tLon; lat0 = tLat; zoom = tZoom; arriveT = 0; }
        } else {
            const dl = ((tLon - lon0 + 540) % 360) - 180;
            lon0 += dl * e; lat0 += (tLat - lat0) * e;
            const far0 = angle(vec({ lat: lat0, lon: lon0 }), vec({ lat: tLat, lon: tLon }));
            want = 1 + (tZoom - 1) * Math.exp(-far0 / 18);   // far away → whole globe, arriving → zoom in
            zoom += (want - zoom) * (1 - Math.exp(-dt / 260));
        }
        const far = angle(vec({ lat: lat0, lon: lon0 }), vec({ lat: tLat, lon: tLon }));
        if (arcT < 1) arcT = Math.min(1, arcT + dt / (fly ? fly.dur * 0.95 : 1100));
        else if (talkT < talkEnd && far < 6) talkT = Math.min(talkEnd, talkT + dt / 900);
        if (arriveT >= 0 && arriveT < 1) arriveT = Math.min(1, arriveT + dt / 1500);
        if (arriveT >= 0 && badgeT < 1) badgeT = Math.min(1, badgeT + dt / 550);
        if (!reduce) pulse += dt / 1600;
        draw();
        const moving = fly || inertia || far > 0.05 || Math.abs(want - zoom) > 0.005 || arcT < 1 || talkT < talkEnd || (arriveT >= 0 && arriveT < 1) || badgeT < 1 || mode === 'travel';
        if (visible && (moving || !reduce)) requestAnimationFrame(frame); else running = false;
    }
    function kick() {
        if (!running && visible) { running = true; lastT = 0; requestAnimationFrame(frame); }
        else if (!visible && dirty) { lon0 = tLon; lat0 = tLat; zoom = tZoom; arcT = 1; talkT = 99; fly = null; arriveT = 1; badgeT = 1; draw(); dirty = false; }
    }

    resize();
    pick(); lon0 = tLon; lat0 = tLat; zoom = tZoom; arcT = 1; talkT = 99; fly = null; arriveT = 1; badgeT = 1;
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(([en]) => { visible = en.isIntersecting; kick(); }, { rootMargin: '100px' }).observe(box);
    } else { visible = true; kick(); }
    draw();
    let tk = 0;
    // phones / narrow screens: once the globe scrolls away it docks as a mini globe top-right and keeps following the timeline
    const narrow = matchMedia('(max-width: 1199px)'), phone = matchMedia('(max-width: 600px)'), career = document.getElementById('career');   // phones: no docking, the mini globe would cover the timeline text
    const ph = document.createElement('div'); ph.className = 'globe-ph'; head.insertBefore(ph, box);
    let boxH = 0;
    addEventListener('resize', () => { boxH = 0; });
    function checkMini() {
        let want = false;
        if (narrow.matches && !phone.matches && career) {
            const top = ph.getBoundingClientRect().top, h = mini ? ph.offsetHeight : (boxH || (boxH = box.offsetHeight)), c = career.getBoundingClientRect();
            want = top + h * 0.6 < 60 && c.bottom > window.innerHeight * 0.55;
        }
        if (want === mini) return;
        ph.style.height = want ? box.offsetHeight + 'px' : '0px';
        mini = want; box.classList.toggle('mini', mini);
        resize(); landKey = ''; draw(); kick();
    }
    addEventListener('scroll', () => { if (!tk) tk = requestAnimationFrame(() => { tk = 0; checkMini(); pick(); }); }, { passive: true });
    addEventListener('resize', () => { checkMini(); resize(); draw(); });

    // Work / Travel switch, hover or tap a travel pin, drag to spin
    box.querySelectorAll('.globe-mode button').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
    const local = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr]; };
    function hit(e) {
        const [x, y] = local(e); let best = -1, bd = 16 * dpr;
        travelPts.forEach(([px, py, i]) => { const d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = i; } });
        return best;
    }
    function hitWork(e) {
        const [x, y] = local(e); let best = null, bd = 16 * dpr;
        workPts.forEach(([px, py, pl]) => { const d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = pl; } });
        return best;
    }
    const clearWork = () => { if (workHover) { workHover = null; kick(); } };
    cv.addEventListener('pointermove', e => {          // Work mode: hovering a city shows that city's photos
        if (mode !== 'work') return;
        const pl = hitWork(e);
        cv.style.cursor = pl && (pl.photos || []).length ? 'zoom-in' : '';
        if (pl) { clearTimeout(unhover); unhover = 0; if (pl !== workHover) { workHover = pl; kick(); } }
        else if (workHover && !unhover) unhover = setTimeout(() => { unhover = 0; if (!bub.matches(':hover')) clearWork(); }, 450);
    });
    cv.addEventListener('click', e => {                // Work mode: clicking a city opens its photos
        if (mode !== 'work') return;
        const pl = hitWork(e), ph = pl && (pl.photos || []);
        if (!ph || !ph.length || !window.cvPhotos) return;
        const s = stops[active];
        window.cvPhotos.open(ph.map(src => ({ src, title: pl.name, text: s && s.talks.includes(pl) ? TT('Talks') : (s ? s.dates : ''), el: bub })), 0);
    });
    cv.addEventListener('pointerdown', e => { if (mode !== 'travel') return; inertia = null; drag = { x: e.clientX, y: e.clientY, lon: tLon, lat: tLat, moved: false, t: performance.now(), vl: 0, va: 0 }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => {
        if (mode !== 'travel') return;
        if (drag) {
            const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
            if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
            const nl = drag.lon - dx * 0.45, na = Math.max(-60, Math.min(70, drag.lat + dy * 0.35)), now = performance.now(), dt = Math.max(1, now - drag.t);
            drag.vl = drag.vl * 0.6 + ((nl - tLon) / dt) * 0.4; drag.va = drag.va * 0.6 + ((na - tLat) / dt) * 0.4; drag.t = now;   // smoothed fling speed
            tLon = nl; tLat = na;
            lon0 = tLon; lat0 = tLat; kick(); return;
        }
        const h = hit(e);
        cv.style.cursor = h >= 0 ? 'pointer' : 'grab';
        if (h >= 0) { clearTimeout(unhover); if (h !== hover) { hover = h; travelLabel(); kick(); } }
        else if (hover >= 0 && !unhover) unhover = setTimeout(() => { unhover = 0; if (!bub.matches(':hover')) { hover = -1; travelLabel(); } }, 450);
    });
    const end = e => {
        if (!drag) return;
        if (!drag.moved) { hover = hit(e); travelLabel(); }   // tap selects a pin on touch screens
        else if (!reduce && performance.now() - drag.t < 80 && Math.abs(drag.vl) + Math.abs(drag.va) > 0.01)
            inertia = { vl: Math.max(-0.6, Math.min(0.6, drag.vl)), va: Math.max(-0.3, Math.min(0.3, drag.va)) };
        drag = null; spinPause = performance.now() + 2500; kick();
    };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    cv.addEventListener('pointerleave', e => {
        if (mode === 'work') { if (workHover && !e.relatedTarget?.closest?.('.globe-photo')) { clearTimeout(unhover); unhover = setTimeout(() => { unhover = 0; if (!bub.matches(':hover')) clearWork(); }, 450); } return; }
        if (drag || hover < 0 || !matchMedia('(hover: hover)').matches || e.relatedTarget?.closest?.('.globe-photo')) return;
        clearTimeout(unhover); unhover = setTimeout(() => { unhover = 0; if (!bub.matches(':hover')) { hover = -1; travelLabel(); spinPause = performance.now() + 800; } }, 450);
    });
    bub.addEventListener('pointerenter', () => { clearTimeout(unhover); unhover = 0; });
    bub.addEventListener('pointerleave', e => {
        if (e.relatedTarget?.closest?.('canvas')) return;
        if (mode === 'travel') { hover = -1; travelLabel(); } else clearWork();
    });
    bub.addEventListener('click', () => {
        if (!shots.length) return;
        if (window.cvPhotos) window.cvPhotos.open(shots.map(x => ({ src: x.src, title: x.title, text: x.text, el: bub })), shotIdx);
        else window.open(shots[shotIdx].src, '_blank', 'noopener');
    });
})();
