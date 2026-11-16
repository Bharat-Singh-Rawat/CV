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
        let left = x + 14, top = y - h - 10;
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
        if (m === 'travel') { tZoom = 1; tLat = 25; tLon = lon0; arcFrom = arcTo = null; travelLabel(); }
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
        talkT = reduce ? 1 : 0;
        if (reduce) { lon0 = tLon; lat0 = tLat; zoom = tZoom; }
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

    function arc(a, b, t, color, width, dash, c, rad, lens) {
        const d = angle(a, b) * R, lift = Math.min(0.3, 0.04 + d * 0.16), steps = 64, end = Math.round(steps * Math.min(1, t));
        ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.setLineDash(dash);
        ctx.beginPath(); let pen = false, head = null;
        for (let k = 0; k <= end; k++) {
            const u = k / steps, v = slerp(a, b, u), h = 1 + lift * Math.sin(Math.PI * u);
            const p = proj(v[0] * h, v[1] * h, v[2] * h);
            const vis = p[2] > 0 || Math.hypot(p[0], p[1]) * h > 1;
            const x = c + p[0] * rad, y = c - p[1] * rad;
            if (vis && Math.hypot(x - c, y - c) < lens) { pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true; head = [x, y]; } else pen = false;
        }
        ctx.strokeStyle = color; ctx.stroke(); ctx.setLineDash([]);
        return t < 1 ? head : null;
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
            const dr = Math.max(0.8, W / 420) * (0.75 + 0.35 * zoom) * (mini ? 1.5 : 1);
            L.fillStyle = `rgb(${ink})`;
            for (let i = 0; i < n; i += step) {
                const p = proj(vx[i], vy[i], vz[i]); if (p[2] <= 0.02) continue;
                const x = c + p[0] * rad, y = c - p[1] * rad;
                if ((x - c) * (x - c) + (y - c) * (y - c) > lens * lens) continue;
                L.globalAlpha = (dark ? 0.12 : 0.14) + p[2] * (dark ? 0.55 : 0.56);
                L.fillRect(x - dr / 2, y - dr / 2, dr, dr);
            }
            L.globalAlpha = 1;
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
            ctx.strokeStyle = `rgba(${ink},0.12)`; ctx.lineWidth = dpr;
            ctx.beginPath(); ctx.arc(c, c, lens - dpr / 2, 0, 7); ctx.stroke();
            return;
        }
        // faint pins for every other stop
        const seen = new Set(), s = stops[active] || stops[0];
        stops.forEach((o, i) => i !== active && o.places.forEach(pl => {
            const k = pl.lat + ',' + pl.lon; if (seen.has(k)) return; seen.add(k);
            const q = at(pl); if (!q) return;
            ctx.fillStyle = `rgba(${ink},0.3)`; ctx.beginPath(); ctx.arc(q[0], q[1], 2.4 * dpr, 0, 7); ctx.fill();
        }));
        // travel arc from the previous stop
        if (arcFrom && arcT > 0) {
            const h = arc(arcFrom, arcTo, arcT, `rgba(${acc},0.85)`, 2 * dpr, [], c, rad, lens);
            if (h) { ctx.fillStyle = `rgb(${acc})`; ctx.beginPath(); ctx.arc(h[0], h[1], 3 * dpr, 0, 7); ctx.fill(); }
        }
        // talks: dashed arcs out from base, orange rings
        const base = vec(centroid(s.places)), labels = [], talkLabels = [];
        workPts = [];
        s.talks.forEach(tp => {
            if (talkT > 0) arc(base, vec(tp), talkT, `rgba(${warm},0.75)`, 1.4 * dpr, [3 * dpr, 4 * dpr], c, rad, lens);
            const q = at(tp); if (!q || talkT < 1) return;
            ctx.strokeStyle = `rgb(${warm})`; ctx.lineWidth = 1.8 * dpr; ctx.fillStyle = dark ? '#000' : '#fff';
            ctx.beginPath(); ctx.arc(q[0], q[1], (tp === workHover ? 5 : 3.6) * dpr, 0, 7); ctx.fill(); ctx.stroke();
            workPts.push([q[0], q[1], tp]);
            talkLabels.push([tp.name.split(',')[0], q, `rgb(${warm})`, false]);
        });
        // active stop: bright pins with a pulse
        const done = new Set();
        s.places.forEach(pl => {
            const q = at(pl); if (!q) return;
            workPts.push([q[0], q[1], pl]);
            ctx.fillStyle = `rgb(${acc})`; ctx.beginPath(); ctx.arc(q[0], q[1], (pl === workHover ? 5.6 : 4.4) * dpr, 0, 7); ctx.fill();
            const k = pulse % 1;
            ctx.strokeStyle = `rgba(${acc},${0.55 * (1 - k)})`; ctx.lineWidth = 1.5 * dpr;
            ctx.beginPath(); ctx.arc(q[0], q[1], (5 + k * 14) * dpr, 0, 7); ctx.stroke();
            const nm = pl.name.split(',')[0]; if (!done.has(nm)) { done.add(nm); labels.push([nm, q, `rgb(${ink})`, true]); }
        });
        if (zoom > 1.6) {                                 // main cities first, then talks where there is room
            const taken = labels.concat(talkLabels).map(([, q]) => [q[0] - 5 * dpr, q[1] - 5 * dpr, q[0] + 5 * dpr, q[1] + 5 * dpr]);
            labels.concat(talkLabels).forEach(([t, q, col, b]) => label(t, q[0], q[1], col, W, b, taken));
        }
        syncShots(); placeBubble(at, arcT >= 1 && Math.abs(zoom - tZoom) < 0.08);
        ctx.restore();
        ctx.strokeStyle = `rgba(${ink},0.12)`; ctx.lineWidth = dpr;
        ctx.beginPath(); ctx.arc(c, c, lens - dpr / 2, 0, 7); ctx.stroke();
    }

    // animation: fly-to (zoom out while turning, zoom back in on arrival); runs only on screen
    let running = false, visible = false, lastT = 0;
    function frame(now) {
        const dt = Math.min(64, now - (lastT || now)); lastT = now;
        const e = 1 - Math.exp(-dt / 380);
        if (mode === 'travel' && !drag && !reduce && hover < 0 && now > spinPause) tLon -= dt * 0.006;   // slow spin
        const dl = ((tLon - lon0 + 540) % 360) - 180;
        lon0 += dl * e; lat0 += (tLat - lat0) * e;
        const far = angle(vec({ lat: lat0, lon: lon0 }), vec({ lat: tLat, lon: tLon }));
        const want = 1 + (tZoom - 1) * Math.exp(-far / 18);   // far away → whole globe, arriving → zoom in
        zoom += (want - zoom) * (1 - Math.exp(-dt / 260));
        if (arcT < 1) arcT = Math.min(1, arcT + dt / 1100);
        else if (talkT < 1 && far < 6) talkT = Math.min(1, talkT + dt / 900);
        if (!reduce) pulse += dt / 1600;
        draw();
        const moving = far > 0.05 || Math.abs(want - zoom) > 0.005 || arcT < 1 || talkT < 1 || mode === 'travel';
        if (visible && (moving || !reduce)) requestAnimationFrame(frame); else running = false;
    }
    function kick() {
        if (!running && visible) { running = true; lastT = 0; requestAnimationFrame(frame); }
        else if (!visible && dirty) { lon0 = tLon; lat0 = tLat; zoom = tZoom; arcT = talkT = 1; draw(); dirty = false; }
    }

    resize();
    pick(); lon0 = tLon; lat0 = tLat; zoom = tZoom; arcT = talkT = 1;
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(([en]) => { visible = en.isIntersecting; kick(); }, { rootMargin: '100px' }).observe(box);
    } else { visible = true; kick(); }
    draw();
    let tk = 0;
    // phones / narrow screens: once the globe scrolls away it docks as a mini globe top-right and keeps following the timeline
    const narrow = matchMedia('(max-width: 1199px)'), career = document.getElementById('career');
    const ph = document.createElement('div'); ph.className = 'globe-ph'; head.insertBefore(ph, box);
    let boxH = 0;
    addEventListener('resize', () => { boxH = 0; });
    function checkMini() {
        let want = false;
        if (narrow.matches && career) {
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
    cv.addEventListener('pointerdown', e => { if (mode !== 'travel') return; drag = { x: e.clientX, y: e.clientY, lon: tLon, lat: tLat, moved: false }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => {
        if (mode !== 'travel') return;
        if (drag) {
            const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
            if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
            tLon = drag.lon - dx * 0.45; tLat = Math.max(-60, Math.min(70, drag.lat + dy * 0.35));
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
        drag = null; spinPause = performance.now() + 2500;
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
