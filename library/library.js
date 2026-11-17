/* =====================================================================
   The Library — builds the room from books.js and makes it walkable.
   - Entrance doors swing open, then vertical scrolling walks you along the aisle.
   - Hover a real book: it slides off the shelf and turns its cover to you. Click: the
     reading desk opens it (ex-libris inside, download / read buttons on the page).
   - Hanging lamps switch on and off; the lights button turns day into night.
   - The librarian (search) finds a book and walks you to it. One book should not be pulled.
   ===================================================================== */
(function () {
    const L = window.LIBRARY || { shelves: [], books: [] };
    const root = document.documentElement;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const touch = matchMedia('(hover: none) and (pointer: coarse)').matches;
    // phones / tablets get a lighter room: flat (2D) shelves, no dust, no blur, no floor repaint (desktop unchanged)
    const lite = touch || matchMedia('(max-width: 700px)').matches;
    if (lite) root.classList.add('lite');
    const $ = id => document.getElementById(id);
    const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const pick = a => a[Math.floor(rnd() * a.length)];

    const hall = $('hall'), stage = $('stage'), room = $('room'), aisle = $('aisle'), floor = $('floor'), fore = $('fore');
    const BAY = 560, H = 860, INNER = BAY - 44 - 12;
    // Apple greys: the shelves are black, white and graphite; colour only appears on a book's cover
    const LEATHER = ['#1d1d1f', '#2c2c2e', '#3a3a3c', '#48484a', '#636366', '#8e8e93', '#aeaeb2', '#c7c7cc', '#d1d1d6', '#e5e5ea', '#f2f2f7', '#ffffff', '#1d1d1f', '#f5f5f7'];
    const lum = hex => { const n = parseInt(hex.slice(1), 16); return (0.2126 * (n >> 16) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255)) / 255; };
    const monoSpine = b => { const l = lum(b.color); return l < .22 ? ['#1d1d1f', ''] : l < .45 ? ['#3a3a3c', ''] : ['#f5f5f7', 'light']; };

    // ---------------------------------------------------------------- sound: the CV's own soft UI sounds + haptics (sfx.js)
    // buttons and links are handled by sfx.js itself; books are not buttons, so they call it here
    const muted = () => { try { return reduce || localStorage.getItem('cv-sfx') === 'off'; } catch (e) { return reduce; } };
    const tap = () => { if (touch && navigator.vibrate && !muted()) navigator.vibrate(10); };
    const sfx = {
        hover: () => window.cvSfx && window.cvSfx.hover(),
        click: () => { window.cvSfx && window.cvSfx.click(); tap(); },
        toggle: () => { window.cvSfx && window.cvSfx.toggle(); tap(); }
    };

    // ---------------------------------------------------------------- build the room
    const items = [];       // positions (designed px) of sections, for the minimap
    let x0 = 220;           // a little wall before the first bookcase
    aisle.style.paddingLeft = x0 + 'px';
    const html = [];
    const books = L.books;
    const spineW = b => Math.round(Math.min(56, Math.max(24, b.pages / 17)));
    const realBook = (b, i) => {
        const h = 150 + Math.round(rnd() * 20), w = spineW(b), d = Math.round(h * .72);
        const img = b.cover === false ? '' : `--img:url('/CV/library/covers/${b.id}.webp');`;
        const [sc, ink] = monoSpine(b);
        const author = b.author.split(/,|&/)[0].trim().split(' ').pop();
        return `<div class="book real" tabindex="0" role="button" data-i="${i}" ${ink ? `data-ink="${ink}"` : ''}
            aria-label="${esc(b.title)} by ${esc(b.author)}" style="--h:${h}px;--w:${w}px;--d:${d}px;--c:${sc};${img}">
            ${lite ? '' : '<div class="top"></div><div class="side"></div>'}
            <div class="spine"><span class="t">${esc(b.title)}</span><span class="a">${esc(author)}</span></div></div>`;
    };
    const filler = (w, extra = '') => {
        const h = 118 + Math.round(rnd() * 50), c = pick(LEATHER);
        return `<div class="book filler ${extra}" aria-hidden="true" style="--h:${h}px;--w:${w}px;--d:${Math.round(h * .72)}px;--c:${c}">${lite ? '' : '<div class="top"></div><div class="side"></div>'}<div class="spine"></div></div>`;
    };
    const OBJ = {
        plant: `<div class="obj" aria-hidden="true"><svg width="70" height="110" viewBox="0 0 70 110"><path d="M35 70 C20 40 4 44 2 30 C18 30 30 46 35 70Z" fill="#4a6b47"/><path d="M35 70 C40 36 56 30 66 18 C66 40 46 50 35 70Z" fill="#5a7d56"/><path d="M35 72 C30 30 36 12 34 0 C46 18 42 44 35 72Z" fill="#6b8f66"/><path d="M35 72 C24 56 10 62 4 56 C14 50 28 54 35 72Z" fill="#3f5c3d"/><path d="M15 72 H55 L51 110 H19Z" fill="#f5f5f7" stroke="#d2d2d7"/></svg></div>`,
        hourglass: `<div class="obj" aria-hidden="true"><svg width="40" height="84" viewBox="0 0 40 84"><rect x="2" y="0" width="36" height="5" rx="2" fill="currentColor"/><rect x="2" y="79" width="36" height="5" rx="2" fill="currentColor"/><rect x="5" y="5" width="2" height="74" fill="currentColor" opacity=".6"/><rect x="33" y="5" width="2" height="74" fill="currentColor" opacity=".6"/><path d="M9 6 H31 C31 26 22 34 20 42 C22 50 31 58 31 78 H9 C9 58 18 50 20 42 C18 34 9 26 9 6Z" fill="rgba(127,127,135,.15)" stroke="currentColor" stroke-opacity=".35"/><path d="M13 20 H27 C26 28 21 34 20 40 C19 34 14 28 13 20Z" fill="#a1a1a6"/><path d="M11 77 C12 66 17 62 20 60 C23 62 28 66 29 77Z" fill="#a1a1a6"/></svg></div>`,
        globe: `<div class="obj" aria-hidden="true"><svg width="74" height="104" viewBox="0 0 74 104"><circle cx="37" cy="40" r="28" fill="none" stroke="currentColor" stroke-width="1.5"/><ellipse cx="37" cy="40" rx="12" ry="28" fill="none" stroke="currentColor" stroke-opacity=".5"/><path d="M9 40 H65 M13 26 H61 M13 54 H61" stroke="currentColor" stroke-opacity=".5"/><path d="M7 40 A30 30 0 0 0 67 40" fill="none" stroke="currentColor" stroke-width="2.5"/><rect x="35" y="70" width="4" height="22" fill="currentColor"/><ellipse cx="37" cy="97" rx="18" ry="4" fill="currentColor"/></svg></div>`,
        frame: `<div class="obj" aria-hidden="true"><svg width="78" height="96" viewBox="0 0 78 96"><rect x="0" y="0" width="70" height="90" rx="2" fill="#1d1d1f"/><rect x="5" y="5" width="60" height="80" fill="#fff"/><text x="35" y="42" text-anchor="middle" font-family="-apple-system,Helvetica,Arial" font-size="12" font-weight="600" fill="#1d1d1f">J ∝ V³ᐟ²</text><text x="35" y="60" text-anchor="middle" font-family="-apple-system,Helvetica,Arial" font-size="7.5" fill="#6e6e73">Child, 1911</text></svg></div>`
    };
    const stack = () => {
        let s = '<div class="stack" aria-hidden="true">';
        for (let k = 0, n = 2 + Math.floor(rnd() * 3); k < n; k++) s += `<div class="lying" style="--t:${12 + Math.round(rnd() * 12)}px;--l:${100 + Math.round(rnd() * 34)}px;--o:${Math.round(rnd() * 16 - 8)}px;--c:${pick(LEATHER)}"></div>`;
        return s + '</div>';
    };
    // fill a shelf: the real books first (with a bookend), then old leather volumes, sometimes an object
    function shelf(real, opts = {}) {
        let used = 0, out = '';
        const put = (s, w) => { out += s; used += w + 1; };
        if (opts.object && rnd() < .5) put(OBJ[opts.object], opts.object === 'globe' ? 90 : 70);
        if (real.length) {
            real.forEach(([b, i]) => put(realBook(b, i), spineW(b)));
            put('<div class="bookend" aria-hidden="true"></div>', 26);
        }
        if (opts.stack) put(stack(), 140);
        if (opts.secret) put(`<div class="book filler secret" role="button" tabindex="0" aria-label="A book that says: do not pull" style="--h:158px;--w:30px;--d:114px;--c:#ff3b30"><div class="top"></div><div class="side"></div><div class="spine"><span class="t" style="display:block;font-size:8px;letter-spacing:.2em">DO NOT PULL</span></div></div>`, 30);
        let tail = '';
        if (opts.object && !out.includes('class="obj"')) { tail = OBJ[opts.object]; used += opts.object === 'globe' ? 90 : 70; }
        while (used < INNER - 26) {
            const w = Math.min(INNER - used - 1, 14 + Math.round(rnd() * 18));
            if (w < 12) break;
            const lean = rnd() < .05 && INNER - used > 80 ? 'lean' : '';
            put(filler(w, lean), w + (lean ? 14 : 0));
        }
        return `<div class="shelf">${out}${tail}</div>`;
    }
    const objs = ['plant', 'hourglass', 'globe', 'frame'];
    let pos = x0;
    L.shelves.forEach((sec, si) => {
        const mine = books.map((b, i) => [b, i]).filter(([b]) => b.shelf === sec.id);
        const rows = [[], [], [], []];
        // eye level first (rows 1 and 2), then row 0, then row 3
        const order = [1, 2, 0, 3];
        const per = Math.max(1, Math.ceil(mine.length / 2));
        mine.forEach((bi, k) => {
            let r = order[Math.min(3, Math.floor(k / per))];
            // keep a row from overflowing
            while (rows[r].reduce((s, [b]) => s + spineW(b), 0) + spineW(bi[0]) > INNER - 120) r = order[(order.indexOf(r) + 1) % 4];
            rows[r].push(bi);
        });
        const secret = sec.id === 'fun';
        const shelvesHtml = rows.map((r, k) => shelf(r, {
            object: k === (si % 2 ? 0 : 3) ? objs[si % objs.length] : null,
            stack: k === 3 && si % 2 === 0,
            secret: secret && k === 3
        })).join('');
        items.push({ name: sec.name, x: pos + BAY / 2 });
        html.push(`<section class="bay lit${secret ? ' secret-bay' : ''}" data-sec="${si}" aria-label="${esc(sec.name)}">
            <button type="button" class="lamp" aria-label="Switch the lamp over ${esc(sec.name)}"><span class="cord"></span><span class="shade-top"></span><span class="bulb"></span></button>
            <div class="crown"></div><div class="sign">${esc(sec.name)}</div>
            ${secret ? `<a class="passage" href="/CV/#retro" aria-label="Secret passage">
                 <span>Secret passage</span><b>Play Bio Menace ▸</b></a>` : ''}
            <div class="case">${shelvesHtml}</div><div class="plinth"></div>
            <div class="glow"></div><div class="shade"></div></section>`);
        pos += BAY + 24;
        if (si === 1 || si === 3) {
            html.push(`<div class="window" aria-hidden="true"><div class="frame"></div><div class="sill"></div><div class="plant">${OBJ.plant.replace('class="obj"', 'class="obj big"')}</div><div class="beam"></div></div>`);
            pos += 330 + 24;
        } else html.push('<div style="width:24px;flex:none"></div>');
    });
    const NOOK = pos;                      // the study table sits at NOOK + 300 … NOOK + 800
    items.push({ name: 'Reading nook', x: pos + 380 });
    html.push(`<div class="nook">
        <div class="note"><h2>More books are coming.</h2><p>The librarian is still collecting. Take any book off the shelves, or <a href="/CV/">go back to the CV</a>.</p></div>
        <canvas class="desk-scene" id="deskScene" width="60" height="46" aria-hidden="true"></canvas></div>`);
    pos += 760;
    aisle.innerHTML = html.join('');
    const AISLE_W = pos + 80;

    // ---------------------------------------------------------------- the reading cart
    // every book you open lands on the cart (remembered in this browser); click one to open it again
    const cart = document.createElement('div');
    cart.className = 'cart'; cart.id = 'cart';
    cart.innerHTML = `<div class="cart-head"><b>Your reading pile</b><button type="button" class="cart-clear" aria-label="Clear the pile">Clear</button></div>
        <div class="cart-pile" id="pile"></div>
        <svg class="cart-frame" viewBox="0 0 220 70" aria-hidden="true">
            <rect x="6" y="0" width="208" height="8" rx="3" fill="currentColor"/>
            <path d="M14 8 V44 M206 8 V44" stroke="currentColor" stroke-width="4"/><rect x="6" y="40" width="208" height="6" rx="3" fill="currentColor" opacity=".5"/>
            <g class="wheel" style="transform-origin:34px 58px"><circle cx="34" cy="58" r="11" fill="none" stroke="currentColor" stroke-width="4"/><path d="M34 47 V69 M23 58 H45" stroke="currentColor" stroke-width="2"/></g>
            <g class="wheel" style="transform-origin:186px 58px"><circle cx="186" cy="58" r="11" fill="none" stroke="currentColor" stroke-width="4"/><path d="M186 47 V69 M175 58 H197" stroke="currentColor" stroke-width="2"/></g>
        </svg>`;
    stage.appendChild(cart);
    const pileEl = cart.querySelector('#pile'), wheels = cart.querySelectorAll('.wheel');
    let pile = []; try { pile = JSON.parse(localStorage.getItem('lib-pile') || '[]').filter(i => books[i]); } catch (e) { /* private mode */ }
    function drawPile(added) {
        pileEl.innerHTML = pile.length ? pile.map(i => {
            const b = books[i], [c, ink] = monoSpine(b);
            return `<button type="button" class="pile-book${i === added ? ' drop' : ''}" data-i="${i}" style="--c:${c};--w:${150 + (i * 37) % 40}px"${ink ? ' data-ink="light"' : ''} title="${esc(b.title)}">${esc(b.title)}</button>`;
        }).join('') : '<span class="pile-empty">Books you open land here</span>';
        cart.classList.toggle('has', pile.length > 0);
    }
    function addToPile(i) {
        if (pile[pile.length - 1] === i) return;
        pile = pile.filter(x => x !== i); pile.push(i); if (pile.length > 6) pile.shift();
        try { localStorage.setItem('lib-pile', JSON.stringify(pile)); } catch (e) { /* private mode */ }
        drawPile(i);
    }
    pileEl.addEventListener('click', e => { const b = e.target.closest('.pile-book'); if (b) openDesk(+b.dataset.i, aisle.querySelector(`.book.real[data-i="${b.dataset.i}"]`)); });
    cart.querySelector('.cart-clear').addEventListener('click', () => { pile = []; try { localStorage.removeItem('lib-pile'); } catch (e) {} drawPile(); });
    drawPile();
    if (touch) $('hint').textContent = 'Swipe to walk the aisle · tap a book to take it to the desk';

    // minimap
    const mm = $('minimap');
    mm.innerHTML = items.map((it, i) => `<button type="button" data-i="${i}">${esc(it.name)}</button>`).join('');

    // ---------------------------------------------------------------- sizing + walking
    let k = 1, walkMax = 0, vw = 0, vh = 0, floorH = 0;
    function layout() {
        vw = stage.clientWidth; vh = stage.clientHeight;
        floorH = Math.round(Math.min(150, Math.max(60, vh * .13)));
        const portrait = vh > vw;
        const lampRoom = !portrait && vh > 640 ? 120 : 24;
        k = Math.max(.42, Math.min(1.15, (vh - floorH - 52 - lampRoom) / H));
        root.style.setProperty('--k', k);
        root.style.setProperty('--floor-h', floorH + 'px');
        root.style.setProperty('--case-h', Math.round((H - 40) * k) + 'px');
        root.style.setProperty('--plank', Math.round(420 * k) + 'px');
        walkMax = Math.max(0, AISLE_W * k - vw);
        hall.style.height = (vh + walkMax) + 'px';
        const mr = mm.getBoundingClientRect();                 // keep the cart clear of the section buttons
        cartMax = mr.left > vw * .3 ? mr.left - 226 : vw - 222;
        clearTimeout(layout.h); layout.h = setTimeout(() => $('hint').classList.add('off'), 7000);
        target = Math.min(walkMax, Math.max(0, scrollY));
        if (!cur) cur = target;
    }
    let target = 0, cur = 0, mx = .5, my = .5, lmx = .5, lmy = .5, raf = 0;
    let cartX = 12, cartRot = 0, moving = false, cartMax = 600;
    function frame() {
        raf = 0;
        cur += (target - cur) * (reduce || lite ? 1 : .14);
        if (Math.abs(target - cur) < .3) cur = target;
        lmx += (mx - lmx) * .06; lmy += (my - lmy) * .06;
        aisle.style.transform = `translate3d(${-cur}px,0,0) scale(${k})`;
        if (!lite) {
            room.style.perspectiveOrigin = `${50 + (lmx - .5) * 30}% ${45 + (lmy - .5) * 16}%`;
            floor.style.setProperty('--walk', (-cur) + 'px');
        }
        fore.style.transform = `translate3d(${-cur * 1.35 + (lmx - .5) * -30}px,0,0)`;
        // the cart rolls over to the bookcase you are at and parks at its left side
        const here = (cur + vw / 2) / k;
        let sec = items[0]; for (const it of items) if (it.x - BAY / 2 - 40 <= here) sec = it;
        const cartT = Math.max(12, Math.min(cartMax, (sec.x - BAY / 2 + 20) * k - cur));
        const dx = (cartT - cartX) * (reduce ? 1 : .07); cartX += dx; cartRot += dx * 2.2;
        cart.style.transform = `translate3d(${cartX}px,0,0)`;
        wheels.forEach(w => { w.style.transform = `rotate(${cartRot}deg)`; });
        moving = Math.abs(cartT - cartX) > .4;
        updateMinimap();
        if (moving || Math.abs(target - cur) > .3 || Math.abs(mx - lmx) > .002 || Math.abs(my - lmy) > .002) raf = requestAnimationFrame(frame);
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
    addEventListener('scroll', () => {
        target = Math.min(walkMax, Math.max(0, scrollY)); kick();
        if (scrollY > 40) $('hint').classList.add('off');
        hideTag();
    }, { passive: true });
    addEventListener('resize', () => { layout(); kick(); });
    if (!touch) addEventListener('mousemove', e => {
        mx = e.clientX / innerWidth; my = e.clientY / innerHeight;
        kick();
    }, { passive: true });
    const walkTo = (designedX, smooth = true) => scrollTo({ top: Math.max(0, Math.min(walkMax, designedX * k - vw / 2)), behavior: smooth && !reduce ? 'smooth' : 'auto' });
    addEventListener('keydown', e => {
        if (deskOpen || e.target.matches('input')) return;
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); scrollBy({ top: (e.key === 'ArrowRight' ? 1 : -1) * BAY * k * .8, behavior: 'smooth' }); }
    });

    let lastMm = -1;
    function updateMinimap() {
        const c = (cur + vw / 2) / k;
        let best = 0; items.forEach((it, i) => { if (Math.abs(it.x - c) < Math.abs(items[best].x - c)) best = i; });
        if (best === lastMm) return; lastMm = best;
        mm.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i === best));
        const on = mm.querySelector('.on'); if (on && mm.scrollWidth > mm.clientWidth) mm.scrollTo({ left: on.offsetLeft - mm.clientWidth / 2 + on.offsetWidth / 2, behavior: 'smooth' });
    }
    mm.addEventListener('click', e => { const b = e.target.closest('button'); if (b) walkTo(items[+b.dataset.i].x); });

    // ---------------------------------------------------------------- hover label
    const tag = document.createElement('div'); tag.className = 'tag'; document.body.appendChild(tag);
    let tagFor = null;
    function showTag(el) {
        const b = books[+el.dataset.i]; tagFor = el;
        const has = b.pdf ? '<i>Free PDF ↓</i>' : b.web ? `<i>Free at ${esc(b.from || 'the web')}</i>` : b.get ? `<i>${/open library/i.test(b.from) ? 'Find it online ↗' : 'PDF at ' + esc(b.from)}</i>` : '';
        tag.innerHTML = `<b>${esc(b.title)}</b><span>${esc(b.author)} · ${b.year}</span>${has}`;
        const r = el.getBoundingClientRect();
        tag.style.left = Math.max(150, Math.min(innerWidth - 150, r.left + r.width / 2)) + 'px';
        tag.style.top = Math.max(150, r.top - 34) + 'px';
        tag.classList.add('show');
    }
    function hideTag() { tag.classList.remove('show'); tagFor = null; clearTimeout(waveT); }
    let lastSlide = 0;
    aisle.addEventListener('mouseover', e => {
        const el = e.target.closest('.book.real');
        if (!el || el === tagFor) return;
        showTag(el);
        if (performance.now() - lastSlide > 70) { sfx.hover(); lastSlide = performance.now(); }
        clearTimeout(waveT);
        waveT = setTimeout(() => {
            if (tagFor !== el || performance.now() - lastWave < 12000 || !window.__lib || !window.__lib.react('wave')) return;
            lastWave = performance.now();
            if (Math.random() < .6) window.__lib.say(pick(['Good choice!', 'Oh, that one is a classic.', 'Take it, it\u2019s free to read.', 'One of my favourites.']));
        }, 1100);
    });
    let waveT = 0, lastWave = -1e9;
    aisle.addEventListener('mouseout', e => { const el = e.target.closest('.book.real'); if (el && !el.contains(e.relatedTarget)) hideTag(); });
    aisle.addEventListener('focusin', e => { const el = e.target.closest('.book.real'); if (el) showTag(el); });
    aisle.addEventListener('focusout', hideTag);

    // ---------------------------------------------------------------- lamps + secret book
    aisle.addEventListener('click', e => {
        const lamp = e.target.closest('.lamp');
        if (lamp) { lamp.closest('.bay').classList.toggle('lit'); return; }      // sfx.js plays the click (it is a button)
        const secret = e.target.closest('.book.secret');
        if (secret) { const bay = secret.closest('.bay'); bay.classList.toggle('open'); sfx.toggle(); return; }
        const el = e.target.closest('.book.real');
        if (el) openDesk(+el.dataset.i, el);
    });
    aisle.addEventListener('keydown', e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const el = e.target.closest('.book.real, .book.secret');
        if (!el) return; e.preventDefault(); el.click();
    });

    // ---------------------------------------------------------------- day / night
    $('lights').addEventListener('click', () => {
        const dark = root.dataset.theme !== 'dark';
        root.dataset.theme = dark ? 'dark' : 'light';
        aisle.querySelectorAll('.bay').forEach(b => b.classList.add('lit'));
    });

    // ---------------------------------------------------------------- the librarian (search)
    const ask = $('ask');
    const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    let firstMatch = null;
    ask.addEventListener('input', () => {
        const q = norm(ask.value.trim());
        const els = aisle.querySelectorAll('.book.real');
        firstMatch = null;
        aisle.classList.toggle('searching', !!q);
        els.forEach(el => {
            const b = books[+el.dataset.i];
            const sec = (L.shelves.find(s => s.id === b.shelf) || {}).name || '';
            const hit = !!q && norm(`${b.title} ${b.author} ${sec} ${b.year}`).includes(q);
            el.classList.toggle('match', hit);
            if (hit && !firstMatch) firstMatch = el;
        });
        if (firstMatch) {
            const bay = firstMatch.closest('.bay'), bi = +bay.dataset.sec;
            walkTo(items[bi].x);
        }
    });
    ask.addEventListener('keydown', e => {
        if (e.key === 'Enter' && firstMatch) { e.preventDefault(); openDesk(+firstMatch.dataset.i, firstMatch); }
        if (e.key === 'Escape') { ask.value = ''; ask.dispatchEvent(new Event('input')); ask.blur(); }
    });

    // ---------------------------------------------------------------- reading desk
    const desk = $('desk'), ob = $('openBook'), front = $('front'), fin = front.querySelector('.front-in'), fout = front.querySelector('.front-out');
    const right = $('rightPage');
    let deskOpen = false, deskI = 0, deskT = 0, lastFocus = null;
    const ORDER = books.map((b, i) => i);
    const ex = `<div class="exlibris"><small>Ex libris</small><b>Bharat Singh Rawat</b><em>Accelerator physicist</em>
        <img class="exlibris-me" src="/CV/library/me-pixel.png?v=3" alt="" width="56" height="56"></div>`;
    fin.innerHTML = ex;
    function fill(i) {
        const b = books[i];
        const sec = (L.shelves.find(s => s.id === b.shelf) || {}).name || '';
        ob.style.setProperty('--c', '#1d1d1f');
        ob.style.setProperty('--img', b.cover === false ? 'none' : `url('/CV/library/covers/${b.id}.webp')`);
        fout.innerHTML = b.cover === false ? `<div style="height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:14px;padding:30px;text-align:center;color:#f5f5f7;background:linear-gradient(90deg,rgba(255,255,255,.08),transparent 10%),#1d1d1f;border-radius:inherit"><b style="font-size:28px;line-height:1.1;letter-spacing:-.02em;font-weight:600">${esc(b.title)}</b><span style="font-size:14px;color:#a1a1a6">${esc(b.author)}</span></div>` : '';
        const acts = [];
        if (b.pdf) acts.push(`<a href="${esc(b.pdf)}" target="_blank" rel="noopener" download>Download PDF ↓</a>`);
        if (b.web) acts.push(`<a href="${esc(b.web)}" target="_blank" rel="noopener"${b.pdf ? ' class="ghost"' : ''}>${b.from ? 'Free at ' + esc(b.from) : 'Read online'} ↗</a>`);
        if (b.get) acts.push(`<a href="${esc(b.get)}" target="_blank" rel="noopener"${acts.length ? ' class="ghost"' : ''}>${/open library/i.test(b.from) ? 'Find it online' : 'Download at ' + esc(b.from)} ↗</a>`);
        right.innerHTML = `<span class="kicker">${esc(sec)}</span><h2>${esc(b.title)}</h2><div class="by">${esc(b.author)}</div><div class="yr">First published ${b.year}</div>
            <div class="rule"></div><p>${esc(b.about || '')}</p><div class="acts">${acts.join('')}</div>`;
    }
    function openDesk(i, fromEl) {
        clearTimeout(deskT); hideTag();
        deskI = i; fill(i); lastFocus = document.activeElement; addToPile(i);
        aisle.querySelectorAll('.pulled').forEach(e => e.classList.remove('pulled'));
        const el = fromEl || aisle.querySelector(`.book.real[data-i="${i}"]`);
        el && el.classList.add('pulled');
        desk.hidden = false; deskOpen = true;
        requestAnimationFrame(() => desk.classList.add('show'));
        ob.classList.remove('opened'); ob.classList.add('closed');
        // fly in from the shelf
        if (el && !reduce) {
            const r = el.getBoundingClientRect();
            ob.style.transition = 'none';
            const dx = r.left + r.width / 2 - innerWidth / 2, dy = r.top + r.height / 2 - innerHeight / 2;
            ob.style.transform = `translate(${dx}px, ${dy}px) scale(.25) rotateY(75deg)`;
            ob.style.opacity = '0';
            ob.getBoundingClientRect();
            ob.style.transition = ''; ob.style.transform = ''; ob.style.opacity = '';
        }
        deskT = setTimeout(() => { ob.classList.remove('closed'); ob.classList.add('opened'); }, reduce ? 0 : 750);
        $('deskClose').focus({ preventScroll: true });
        if (fromEl) sfx.click();
    }
    function closeDesk() {
        if (!deskOpen) return;
        clearTimeout(deskT); deskOpen = false;
        ob.classList.remove('opened'); ob.classList.add('closed');
        desk.classList.remove('show');
        deskT = setTimeout(() => {
            desk.hidden = true; aisle.querySelectorAll('.pulled').forEach(e => e.classList.remove('pulled'));
            if (window.__lib && window.__lib.react('nod') && Math.random() < .5) window.__lib.say(pick(['Enjoy the read.', 'Come back for more.', 'Good book, that.']));
        }, 450);
        lastFocus?.focus?.({ preventScroll: true });
    }
    function turn(step) {
        const j = ORDER[(ORDER.indexOf(deskI) + step + ORDER.length) % ORDER.length];
        clearTimeout(deskT);
        ob.classList.remove('opened'); ob.classList.add('closed');
        deskT = setTimeout(() => {
            deskI = j; fill(j); addToPile(j);
            aisle.querySelectorAll('.pulled').forEach(e => e.classList.remove('pulled'));
            aisle.querySelector(`.book.real[data-i="${j}"]`)?.classList.add('pulled');
            deskT = setTimeout(() => { ob.classList.remove('closed'); ob.classList.add('opened'); }, 380);
        }, reduce ? 0 : 520);
    }
    $('deskClose').addEventListener('click', closeDesk);
    $('prevBook').addEventListener('click', () => turn(-1));
    $('nextBook').addEventListener('click', () => turn(1));
    desk.addEventListener('click', e => { if (e.target === desk || e.target.classList.contains('desk-top') || e.target.classList.contains('lamp-glow')) closeDesk(); });
    addEventListener('keydown', e => {
        if (!deskOpen) return;
        if (e.key === 'Escape') closeDesk();
        if (e.key === 'ArrowRight') turn(1);
        if (e.key === 'ArrowLeft') turn(-1);
    });

    // ---------------------------------------------------------------- dust in the light
    const cv = $('dust'), ctx = cv.getContext('2d');
    const winXs = [...aisle.querySelectorAll('.window')].map(w => w.offsetLeft);
    const bayEls = [...aisle.querySelectorAll('.bay')];
    const motes = Array.from({ length: touch ? 40 : 90 }, () => ({ x: Math.random(), y: Math.random(), r: .6 + Math.random() * 1.6, vx: (Math.random() - .5) * .00012, vy: (Math.random() - .3) * .00008, p: Math.random() * 6.28 }));
    let dustOn = !reduce && !lite;
    function dust(t) {
        if (!dustOn) return;
        if (cv.width !== vw || cv.height !== vh) { cv.width = vw; cv.height = vh; }
        ctx.clearRect(0, 0, vw, vh);
        const dark = root.dataset.theme === 'dark';
        if (dark) {                                      // warm pools of lamp light on the floor, drifting with you as you walk
            const fy = vh - floorH, rx = 270 * k, ry = floorH * .55;
            ctx.globalCompositeOperation = 'lighter';
            bayEls.forEach((b, i) => {
                if (!b.classList.contains('lit')) return;
                const x = items[i].x * k - cur; if (x < -rx * 2 || x > vw + rx * 2) return;
                ctx.save(); ctx.translate(x + (x - vw / 2) * .1, fy + floorH * .38); ctx.scale(1, ry / rx);
                const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
                g.addColorStop(0, 'rgba(255,212,130,.3)'); g.addColorStop(.45, 'rgba(255,200,110,.11)'); g.addColorStop(1, 'rgba(255,200,110,0)');
                ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, 6.283); ctx.fill(); ctx.restore();
            });
            ctx.globalCompositeOperation = 'source-over';
        }
        // light shafts on screen: under each window
        const shafts = winXs.map(x => [(x + 40) * k - cur - 40, (x + 290) * k - cur + 260 * k]);
        for (const m of motes) {
            m.x += m.vx + Math.sin(t / 3000 + m.p) * .00005; m.y += m.vy;
            if (m.x < 0) m.x += 1; if (m.x > 1) m.x -= 1; if (m.y < 0) m.y += 1; if (m.y > 1) m.y -= 1;
            const X = m.x * vw, Y = m.y * vh;
            const inShaft = shafts.some(([a, b]) => X > a && X < b);
            const a = (inShaft ? (dark ? .3 : .22) : (dark ? .1 : .06)) * (.6 + .4 * Math.sin(t / 900 + m.p));
            ctx.fillStyle = dark ? `rgba(245,245,247,${a})` : `rgba(110,110,115,${a})`;
            ctx.beginPath(); ctx.arc(X, Y, m.r, 0, 6.283); ctx.fill();
        }
        requestAnimationFrame(dust);
    }
    document.addEventListener('visibilitychange', () => { const was = dustOn; dustOn = !document.hidden && !reduce && !lite; if (dustOn && !was) requestAnimationFrame(dust); });

    // ---------------------------------------------------------------- the entrance
    const ent = $('entrance');
    function enter() {
        if (ent.classList.contains('open')) return;
        ent.classList.add('open');
        root.classList.remove('locked');
        setTimeout(() => { ent.classList.add('gone'); ent.setAttribute('aria-hidden', 'true'); }, 1700);
    }
    if (reduce || location.hash === '#in') { ent.classList.add('gone'); }
    else {
        root.classList.add('locked');
        $('enter').addEventListener('click', enter);
        ent.addEventListener('click', enter);
        addEventListener('wheel', enter, { once: true, passive: true });
        addEventListener('touchstart', enter, { once: true, passive: true });
        addEventListener('keydown', e => { if (!ent.classList.contains('gone') && (e.key === 'Enter' || e.key === ' ' || e.key.startsWith('Arrow'))) { e.preventDefault(); enter(); } });
        setTimeout(enter, 3200);
    }

    // ---------------------------------------------------------------- the pixel librarian
    // walks the aisle, tidies books on the shelves, and fetches books left on the study table at the right
    const lib = document.createElement('div');
    lib.className = 'librarian'; lib.setAttribute('aria-hidden', 'true');
    lib.innerHTML = '<span class="bubble"></span><canvas width="32" height="48"></canvas>';
    aisle.appendChild(lib);
    const lctx = lib.querySelector('canvas').getContext('2d'), bubble = lib.querySelector('.bubble');
    // Bharat's own sprite sheet (librarian-sheet.png): 6 frames × 4 rows of 32 × 48 px
    //   row 0 = facing you, row 1 = walking left, row 2 = walking right, row 3 = back (facing the shelf)
    const SHEET = new Image(); SHEET.src = '/CV/library/librarian-sheet.png?v=1';
    const FW = 32, FH = 48;
    function sprite(row, col) {
        lctx.clearRect(0, 0, FW, FH);
        if (SHEET.complete && SHEET.naturalWidth) lctx.drawImage(SHEET, col * FW, row * FH, FW, FH, 0, 0, FW, FH);
    }
    let ARM = null;                          // colours for the waving arm, read from his own sprite
    SHEET.onload = () => {
        libTick.k = null;
        try {
            const c = document.createElement('canvas'); c.width = FW; c.height = FH;
            const x = c.getContext('2d'); x.drawImage(SHEET, 0, 0, FW, FH, 0, 0, FW, FH);
            const px = (a, b) => { const d = x.getImageData(a, b, 1, 1).data; return `rgb(${d[0]},${d[1]},${d[2]})`; };
            ARM = { shirt: px(21, 27), sleeve: px(24, 22), skin: px(23, 27), ink: px(6, 20) };
        } catch (e) { /* no wave without pixels */ }
    };
    // reactions: he looks at you and waves when you linger on a book; nods when you put a book back
    function drawReact(kind, el) {
        sprite(0, 0);
        if (kind === 'nod') {
            if (Math.floor(el / 230) % 2) { const head = lctx.getImageData(0, 0, FW, 19); lctx.clearRect(0, 0, FW, 20); lctx.putImageData(head, 0, 1); }
            return;
        }
        if (!ARM) return;
        const up = Math.floor(el / 200) % 2, cells = [];
        for (let y = 13; y <= 18; y++) { const x = 25 + (up ? 1 : Math.round((18 - y) * .45) + 1); cells.push([x, y, ARM.sleeve], [x + 1, y, ARM.sleeve]); }
        const hx = up ? 25 : 27;
        for (let y = 10; y <= 12; y++) for (let x = hx; x <= hx + 2; x++) cells.push([x, y, ARM.skin]);
        const img = lctx.getImageData(0, 0, FW, FH).data, own = new Set(cells.map(([x, y]) => x + ',' + y));
        lctx.fillStyle = ARM.ink;
        cells.forEach(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => {
            const X = x + a, Y = y + b; if (own.has(X + ',' + Y) || X >= FW || Y < 0) return;
            if (img[(Y * FW + X) * 4 + 3] < 128) lctx.fillRect(X, Y, 1, 1);
        }));
        cells.forEach(([x, y, c]) => { lctx.fillStyle = c; lctx.fillRect(x, y, 1, 1); });
        lctx.fillStyle = ARM.shirt; lctx.fillRect(22, 27, 3, 2);       // the arm is up, so no hand at his side
    }
    function react(kind) {
        if (reduce || lb.pose === 'sit') return false;
        const sx = lb.x * k - cur; if (sx < 0 || sx > vw) return false;
        lb.react = { kind, t0: performance.now(), dur: kind === 'wave' ? 1800 : 950 };
        return true;
    }
    const L0 = x0 + 40, L1 = NOOK + 460;      // L1 = the chair at the computer                 // walkable range; L1 = in front of the study table
    const bayXs = items.slice(0, -1).map(it => it.x);
    const lb = { x: x0 + BAY / 2, to: null, pose: 'stand', carry: false, dir: 2, anim: 0, wait: 600, step: 0, task: null, t0: 0 };
    const say = (txt, ms = 1800) => { bubble.textContent = txt; bubble.classList.add('show'); clearTimeout(say.t); say.t = setTimeout(() => bubble.classList.remove('show'), ms); };
    function tidyNear(x) {          // nudge a few old volumes on the bookcase in front of her
        const bay = [...aisle.querySelectorAll('.bay')].find(b => Math.abs(b.offsetLeft + BAY / 2 - x) < BAY / 2 + 20);
        if (!bay) return;
        const f = [...bay.querySelectorAll('.book.filler:not(.secret)')];
        for (let n = 0; n < 3 && f.length; n++) { const el = f.splice(Math.floor(Math.random() * f.length), 1)[0]; el.classList.remove('tidy'); void el.offsetWidth; el.classList.add('tidy'); }
    }
    window.__lib = { react, say };
    // room tone: a distant clock ticking and now and then a page turning (follows the sound toggle)
    if (!reduce) {
        let tock = false;
        setInterval(() => { if (!document.hidden && ent.classList.contains('gone') && window.cvSfx && window.cvSfx.clock) window.cvSfx.clock(tock = !tock); }, 1000);
        const page = () => { if (!document.hidden && ent.classList.contains('gone') && window.cvSfx && window.cvSfx.rustle) window.cvSfx.rustle(); setTimeout(page, 14000 + Math.random() * 18000); };
        setTimeout(page, 9000);
    }
    function nextTask() {
        const r = Math.random();
        if (!lb.carry && r < .35) { lb.task = 'fetch'; lb.to = L1; }                       // go and collect a book from the table
        else { lb.task = lb.carry ? 'shelve' : 'tidy'; lb.to = bayXs[Math.floor(Math.random() * bayXs.length)] + (Math.random() - .5) * 260; }
        lb.to = Math.max(L0, Math.min(L1, lb.to));
        lb.pose = 'walk';
    }
    let lt = 0;
    function libTick(t) {
        if (lite && (libTick.f = !libTick.f)) { requestAnimationFrame(libTick); return; }
        const dt = Math.min(60, t - (lt || t)); lt = t;
        if (!document.hidden) {
            if (lb.react && t - lb.react.t0 > lb.react.dur) { lb.react = null; libTick.k = null; }
            if (lb.react) drawReact(lb.react.kind, t - lb.react.t0);
            else if (lb.pose === 'walk') {
                const d = lb.to - lb.x, v = .17 * dt;      // stride matches his size
                lb.dir = d < 0 ? 1 : 2;
                if (Math.abs(d) <= v) {
                    lb.x = lb.to;
                    if (lb.task === 'fetch') { lb.pose = 'sit'; lb.wait = 4000 + Math.random() * 3500; station.seated = true; lib.style.opacity = '0'; if (Math.random() < .5) say(pick(['Just cataloguing…', 'Updating the index.', 'One more simulation run…'])); }
                    else { lb.pose = 'reach'; lb.wait = 1600; tidyNear(lb.x); if (lb.carry) { lb.carry = false; if (Math.random() < .5) say(pick(['There. Back where it belongs.', 'Alphabetical. Mostly.'])); } else if (Math.random() < .25) say(pick(['Hmm, who moved this?', 'Shh… people are reading.', 'Space-charge limited… shelf space, that is.'])); }
                } else { lb.x += Math.sign(d) * v; lb.step += dt; }
            } else if ((lb.wait -= dt) <= 0) {
                if (lb.pose === 'sit') { station.seated = false; lib.style.opacity = ''; lb.carry = true; lb.pose = 'stand'; lb.task = null; lb.wait = 700; say(pick(['Someone left this on the table…', 'Back to the shelf you go.', 'Tidy desk, tidy mind.'])); }
                else if (lb.pose === 'reach' || lb.task === 'fetch') { lb.pose = 'stand'; lb.task = null; lb.wait = 300 + Math.random() * 1400; }
                else nextTask();
            }
            lb.anim += dt;
            // walking: side rows, 6 frames; tidying a shelf: back row (facing the books); waiting: facing you
            const row = lb.pose === 'walk' ? lb.dir : lb.pose === 'reach' || lb.pose === 'sit' ? 3 : 0;
            const col = lb.pose === 'stand' ? 0 : Math.floor(lb.anim / (lb.pose === 'walk' ? 110 : 260)) % 6;
            const key = row * 10 + col;
            if (!lb.react && key !== libTick.k) { sprite(row, col); libTick.k = key; }
            const sx = lb.x * k - cur;
            if (sx > -400 && sx < vw + 400) lib.style.transform = `translate3d(${lb.x - 160}px, 0, ${lite ? 0 : 40}px)`;
        }
        requestAnimationFrame(libTick);
    }
    // ---------------------------------------------------------------- the study table: an original pixel workstation
    // night-blue nook with a neon atom, a computer and a chair; he sits here (seen from behind) between errands
    const deskCv = $('deskScene'), dctx = deskCv.getContext('2d');
    const station = { seated: false };
    const C = { wall: '#141b38', wall2: '#19224a', brick: '#10162e', neon: '#ff4fd8', neonD: '#a8308f', cyan: '#4fd8ff', top: '#3e4a85', deskc: '#2b3460', deskD: '#1d2448',
                frame: '#0b1024', screen: '#cfe0ff', screenD: '#9fb8ee', code1: '#3b6fe0', code2: '#ff4fd8', code3: '#2fb36b', chair: '#3b2454', chairL: '#5a3a7c', metal: '#6b7398',
                tower: '#20284a', led: '#3cff8a', mug: '#e8e8f0', coffee: '#6b4a2b', leaf: '#3fae6a', leafD: '#2b7a4b', pot: '#e0e4f0', book1: '#4fd8ff', book2: '#ff4fd8', book3: '#e8e8f0' };
    const ATOM = (() => {            // three tilted orbits as pixels, centred on (10, 8)
        const set = new Set();
        for (const rot of [0, Math.PI / 3, -Math.PI / 3]) for (let a = 0; a < 6.283; a += .05) {
            const ex = 6.5 * Math.cos(a), ey = 2.4 * Math.sin(a);
            set.add(Math.round(10 + ex * Math.cos(rot) - ey * Math.sin(rot)) + ',' + Math.round(8 + ex * Math.sin(rot) + ey * Math.cos(rot)));
        }
        return [...set].map(p => p.split(',').map(Number)).filter(([x, y]) => !(x >= 9 && x <= 10 && y >= 7 && y <= 8));
    })();
    function deskDraw(t) {
        const dx = (NOOK + 160) * k - cur;
        if (dx > vw + 50 || dx < -700 || (lite && (deskDraw.f = !deskDraw.f))) { requestAnimationFrame(deskDraw); return; }
        const R = (c, x, y, w = 1, h = 1) => { dctx.fillStyle = C[c]; dctx.fillRect(x, y, w, h); };
        dctx.clearRect(0, 0, 60, 46);
        R('wall', 0, 0, 60, 46);
        for (let y = 3; y < 44; y += 4) { R('brick', 0, y, 60, 1); for (let x = (y % 8 ? 2 : 6); x < 60; x += 8) R('brick', x, y - 3, 1, 3); }
        R('wall2', 0, 0, 60, 2);
        // neon atom sign (flickers now and then)
        const on = !(Math.floor(t / 90) % 37 === 0);
        const N = on ? 'neon' : 'neonD';
        ATOM.forEach(([x, y]) => R(N, x, y));
        R(on ? 'cyan' : 'neonD', 9, 7, 2, 2);                                          // nucleus
        // wall shelf with books
        R('top', 45, 11, 13, 1); R('book1', 46, 6, 2, 5); R('book2', 48, 7, 2, 4); R('book3', 50, 5, 2, 6); R('book1', 53, 8, 4, 1); R('book2', 53, 9, 4, 2);
        // desk
        R('top', 1, 25, 58, 1); R('deskc', 1, 26, 58, 2); R('deskD', 3, 28, 2, 18); R('deskD', 55, 28, 2, 18);
        // computer tower under the desk, blinking LED
        R('tower', 44, 30, 9, 15); R('frame', 45, 31, 7, 1); R(Math.floor(t / 600) % 2 ? 'led' : 'tower', 46, 33); R('led', 46, 35);
        // plant + mug
        R('pot', 3, 21, 5, 4); R('leaf', 4, 16, 1, 5); R('leafD', 2, 17, 2, 2); R('leaf', 6, 15, 1, 6); R('leafD', 7, 17, 2, 2); R('leaf', 5, 18, 1, 3);
        R('mug', 47, 21, 3, 4); R('coffee', 47, 21, 3, 1); R('mug', 50, 22, 1, 2);
        // monitor with scrolling code
        R('frame', 17, 6, 26, 16); R('screen', 18, 7, 24, 14); R('frame', 28, 22, 4, 3); R('frame', 25, 24, 10, 1);
        const scroll = Math.floor(t / (station.seated ? 260 : 900));
        for (let i = 0; i < 6; i++) {
            const n = (i + scroll) % 9, len = [14, 9, 18, 6, 12, 16, 8, 11, 15][n], ind = [0, 2, 2, 4, 2, 0, 2, 4, 0][n];
            R(['code1', 'code3', 'code1', 'code2', 'code1', 'code3', 'code2', 'code1', 'code3'][n], 19 + ind, 8 + i * 2, Math.min(len, 22 - ind), 1);
        }
        if (Math.floor(t / 500) % 2) R('code2', 19 + 12, 18, 2, 1);                     // blinking cursor
        R('screenD', 18, 20, 24, 1);
        // him, from behind, typing (shoulders bob), then the chair back in front of him
        if (station.seated && SHEET.complete && SHEET.naturalWidth) {
            const bob = Math.floor(t / 180) % 2;
            dctx.drawImage(SHEET, 0, 3 * FH, FW, 30, 14, 9 + bob, FW, 30);   // row 3 = his back
        }
        R('chair', 22, 28, 16, 9); R('chairL', 23, 29, 14, 1); R('chair', 21, 37, 18, 2); R('metal', 29, 39, 2, 4); R('metal', 23, 43, 14, 1); R('frame', 23, 44, 2, 2); R('frame', 35, 44, 2, 2); R('frame', 29, 44, 2, 2);
        requestAnimationFrame(deskDraw);
    }
    requestAnimationFrame(deskDraw);

    if (!reduce) { sprite(0, 0); requestAnimationFrame(libTick); }

    layout(); kick();
    if (dustOn) requestAnimationFrame(dust);
    window.cvLibrary = { open: i => openDesk(i), walkTo: i => walkTo(items[i].x, false), station };
})();
