/* =====================================================================
   Apple Music–style mini player for the v2 CV.
   Every song has its artist and, where Deezer has one, a small artist photo (../assets/audio/trackN.mp3).
   ===================================================================== */
(function () {
    // artist photos come from Deezer's public artist images (loaded from Deezer, not stored here)
    const DZ = h => `https://cdn-images.dzcdn.net/images/artist/${h}/250x250-000000-80-0-0.jpg`;
    const CHARANJIT = '11991f605b4396dc9e094f42866e1a27', TIM = 'fa32f3688e3b5901b7588020b0377623',
        NATALIA = 'f5fbaaae3d6a033115868dc7058c5538', CA7 = 'c69cb7418c2564e8fa85046f609317b3';
    const TRACKS = [
        ['Bhairav', 'Charanjit Singh', CHARANJIT],
        ['Kalawati', 'Charanjit Singh', CHARANJIT],
        ['Malkauns', 'Charanjit Singh', CHARANJIT],
        ['Madhuvanti', 'Charanjit Singh', CHARANJIT],
        ['Bad Bitch', 'CA7RIEL & Paco Amoroso', CA7],
        ['Перепутала', 'SEREBRO', 'd2938486410961d6ee3740f5a182f712'],
        ['Acenda o farol', 'Tim Maia', TIM],
        ['O Descobridor Dos Sete Mares', 'Tim Maia', TIM],
        ['Amores Lejanos', 'Enanitos Verdes', '60e759fb216cce02b2cbcefbec682a9c'],
        ['Mi Manera de querer', 'Natalia Lafourcade', NATALIA],
        ['Aja mahi', 'RDB', 'b9b8c82b2cac67929f65a50bd4c9d75e'],
        ['خونه ی ما', 'Marjan Farsad', 'eb8d7329eed5fb6da9b8833078b4ac28'],
        ['Vienna Calling', 'Falco', 'a335e3e8a0f8f47e74f1eb8524259c95'],
        ['Ciudad de la furia', 'Soda Stereo', '7c8fb9b4135ea113a18d7380686bc764'],
        ['ВИРТУАЛЬНАЯ ЛЮБОВЬ', 'Tanin Jazz', '70d4889b1d753f680b5d74727f1a9204'],
        ['Oye mi amor', 'Maná', '0070bd97f335b25c673537e9b81fa081'],
        ['Come', 'Jain', '4081ad8f96b9b8215a1a42e45ae7d17b'],
        ['Mas que nada', "Sérgio Mendes & Brasil '66", 'f09e7276d2d22b0b23cbe8d26ff61f62'],
        ['Ring my bell', 'Anita Ward', '89b56883bc4c68e5c38f63be5bf01722'],
        ['Soledad y el mar', 'Natalia Lafourcade ft. Los Macorinos', NATALIA],
        ['Take 5', 'The Dave Brubeck Quartet', '1c143ef3d80d8a82421f7a75fd689930'],
        ['Babaji ki Booti', 'Go Goa Gone soundtrack', ''],
        ['Jiya Jale', 'Berklee Indian Ensemble · A. R. Rahman cover', 'a4ab4e262b5c9dbea22ff16d3f0c6ef0'],
        ['Hasta Jesús Tuvo Un Mal Día', 'CA7RIEL & Paco Amoroso, Sting', 'c69cb7418c2564e8fa85046f609317b3'],
        ['Edge Of Desire', 'Jonas Blue, Malive', '49f84318807cd6e2ba0acf4986f66ea6'],
        ['Bzrp Music Sessions #53', 'Bizarrap & Shakira', '69c569506a8ff6ab0edfecbd1adf94b0'],
        ['Sixteen Tons', 'Tennessee Ernie Ford · cover', 'b9f10f498b6819917e0d630290971fa0'],
        ['Altyn', 'Tatarka', 'd77ae307c50559d7939cb61e1b7ef265'],
        ['Ökpeletpe', 'Yenlik', '4801f1e34988692cfa2088f74052264a'],
        ['DOP', 'Yenlik', '4801f1e34988692cfa2088f74052264a'],
        ['Bipl · A COLORS SHOW', 'Yenlik', '4801f1e34988692cfa2088f74052264a'],
        ['Zoobie Doobie · piano cover', 'Chetan Ghodeshwar', ''],
        ['八方来财 · 因果', '揽佬 SKAI ISYOURGOD', 'fdc08b353e72e3724a292eed1840775d'],
        ['大展鸿图', '揽佬 SKAI ISYOURGOD ft. AR刘夫阳', 'fdc08b353e72e3724a292eed1840775d']
    ].map(([title, artist, img], i) => ({ title, artist, img: img && DZ(img), file: `/CV/assets/audio/track${i + 1}.mp3` }));

    const $ = id => document.getElementById(id);
    const T = window.T || (s => s), LANG = window.LANG || 'en';
    const ML = { es: ['Mi playlist', 'canciones', 'pulsa play', 'A continuación', 'Pista', 'de'], ru: ['Мой плейлист', 'песен', 'нажмите ▶', 'Далее', 'Трек', 'из'] }[LANG] || ['My playlist', 'songs', 'tap play', 'Up Next', 'Track', 'of'];
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const fmt = t => !isFinite(t) ? '0:00' : `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
    // artwork: a soft two-tone gradient derived from the title, like Apple Music's generated covers
    const hue = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
    const grad = t => { const h = hue(t.title), l = 18 + (h % 5) * 6; return `linear-gradient(135deg, hsl(0 0% ${l + 22}%), hsl(0 0% ${l}%))`; };
    // with a photo, the gradient stays underneath, so a photo that fails to load still leaves a cover
    const art = t => t.img ? `url('${t.img}') center / cover no-repeat, ${grad(t)}` : grad(t);

    const ICON = {
        play: '<svg viewBox="0 0 24 24"><path d="M7 4.6v14.8a1 1 0 0 0 1.5.86l12.3-7.4a1 1 0 0 0 0-1.72L8.5 3.74A1 1 0 0 0 7 4.6z"/></svg>',
        pause: '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4.2" height="16" rx="1.2"/><rect x="13.8" y="4" width="4.2" height="16" rx="1.2"/></svg>',
        prev: '<svg viewBox="0 0 24 24"><path d="M11.5 12 21 18V6zM2.5 12 12 18V6z"/></svg>',
        next: '<svg viewBox="0 0 24 24"><path d="M12.5 12 3 18V6zM21.5 12 12 18V6z"/></svg>',
        shuffle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>',
        note: '<svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>'
    };

    document.body.insertAdjacentHTML('beforeend', `
    <div class="mp collapsed" id="mp" aria-label="Music player">
        <button type="button" class="mp-fab" id="mp-fab" aria-label="Open music player">${ICON.note}<span class="mp-fab-eq" aria-hidden="true"><i></i><i></i><i></i></span></button>
        <div class="mp-queue" id="mp-queue" hidden>
            <div class="mp-queue-head"><span>${ML[3]}</span><span class="mp-count">${TRACKS.length} ${ML[1]}</span></div>
            <ol id="mp-list">${TRACKS.map((t, i) => `
                <li><button type="button" data-i="${i}"><span class="mp-q-art" style="background:${art(t)}"></span><span class="mp-q-title">${esc(t.title)}${t.artist ? `<small>${esc(t.artist)}</small>` : ''}</span><span class="mp-q-eq" aria-hidden="true"><i></i><i></i><i></i></span></button></li>`).join('')}
            </ol>
        </div>
        <div class="mp-bar">
            <button type="button" class="mp-art" id="mp-art" aria-label="Show playlist" aria-expanded="false">${ICON.note}</button>
            <button type="button" class="mp-info" id="mp-info" aria-label="Show playlist">
                <span class="mp-title" id="mp-title">${ML[0]}</span>
                <span class="mp-sub" id="mp-sub">${TRACKS.length} ${ML[1]} · ${ML[2]}</span>
            </button>
            <div class="mp-ctrls">
                <button type="button" class="mp-btn small" id="mp-prev" aria-label="Previous">${ICON.prev}</button>
                <button type="button" class="mp-btn" id="mp-play" aria-label="Play">${ICON.play}</button>
                <button type="button" class="mp-btn small" id="mp-next" aria-label="Next">${ICON.next}</button>
                <button type="button" class="mp-btn small mp-min" id="mp-min" aria-label="Minimise player"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></button>
                <button type="button" class="mp-btn small mp-shuffle on" id="mp-shuffle" aria-label="Shuffle play: random song" title="Shuffle play">${ICON.shuffle}</button>
            </div>
            <div class="mp-progress" id="mp-progress" role="slider" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0">
                <div class="mp-fill" id="mp-fill"></div>
            </div>
            <div class="mp-times"><span id="mp-cur">0:00</span><span id="mp-dur">0:00</span></div>
        </div>
    </div>`);

    const store = {
        get: k => { try { return JSON.parse(localStorage.getItem('cv-music-' + k)); } catch (e) { return null; } },
        set: (k, v) => { try { localStorage.setItem('cv-music-' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
    };
    const audio = new Audio();
    audio.preload = 'none';
    let idx = -1, shuffle = true, order = [], seeking = false;
    const mp = $('mp');

    const shuffled = () => { const a = TRACKS.map((_, i) => i); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const nextIndex = dir => {
        if (!shuffle) return (idx + dir + TRACKS.length) % TRACKS.length;
        if (!order.length) order = shuffled();
        const pos = order.indexOf(idx);
        return order[(pos + dir + order.length) % order.length];
    };

    function load(i, autoplay) {
        idx = i;
        const t = TRACKS[i];
        audio.src = t.file;
        $('mp-title').textContent = t.title;
        $('mp-sub').textContent = t.artist || `${ML[4]} ${i + 1} ${ML[5]} ${TRACKS.length}`;
        $('mp-art').style.background = art(t);
        $('mp-art').classList.add('has-art');
        $('mp-art').classList.toggle('has-photo', !!t.img);
        document.querySelectorAll('#mp-list button').forEach(b => b.classList.toggle('current', +b.dataset.i === i));
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist || 'My playlist', album: 'Bharat Singh Rawat',
                artwork: t.img ? [{ src: t.img, sizes: '250x250', type: 'image/jpeg' }] : [] });
        }
        if (autoplay) play();
    }
    function play() {
        if (idx < 0) load(shuffle ? (order = shuffled())[0] : 0, false);
        audio.play().catch(() => { /* blocked until a user gesture */ });
    }
    const pause = () => audio.pause();

    audio.addEventListener('play', () => { $('mp-play').innerHTML = ICON.pause; $('mp-play').setAttribute('aria-label', 'Pause'); mp.classList.add('playing'); });
    audio.addEventListener('pause', () => { $('mp-play').innerHTML = ICON.play; $('mp-play').setAttribute('aria-label', 'Play'); mp.classList.remove('playing'); });
    audio.addEventListener('ended', () => load(nextIndex(1), true));
    audio.addEventListener('loadedmetadata', () => { $('mp-dur').textContent = fmt(audio.duration); });
    audio.addEventListener('timeupdate', () => {
        if (seeking || !audio.duration) return;
        const p = audio.currentTime / audio.duration;
        $('mp-fill').style.transform = `scaleX(${p})`;
        $('mp-progress').setAttribute('aria-valuenow', Math.round(p * 100));
        $('mp-cur').textContent = fmt(audio.currentTime);
    });

    $('mp-play').addEventListener('click', () => audio.paused ? play() : pause());
    $('mp-next').addEventListener('click', () => load(nextIndex(1), true));
    $('mp-prev').addEventListener('click', () => { if (audio.currentTime > 3) audio.currentTime = 0; else load(nextIndex(-1), true); });
    // shuffle play: every click jumps to a random song (never the current one) and keeps shuffle on
    $('mp-shuffle').addEventListener('click', () => {
        shuffle = true;
        order = shuffled().filter(i => i !== idx);
        if (idx >= 0) order.unshift(idx);              // keep the current song as the "previous" one
        load(idx >= 0 ? order[1] : order[0], true);
        const btn = $('mp-shuffle');
        btn.classList.remove('spin'); void btn.offsetWidth; btn.classList.add('spin');
    });

    // seek by click / drag / arrow keys
    const bar = $('mp-progress');
    let pendingSeek = null;                          // a click before the song's length is known
    const seekTo = x => {
        const r = bar.getBoundingClientRect(), p = Math.min(1, Math.max(0, (x - r.left) / r.width));
        $('mp-fill').style.transform = `scaleX(${p})`;
        if (audio.duration) { audio.currentTime = p * audio.duration; $('mp-cur').textContent = fmt(audio.currentTime); }
        else pendingSeek = p;
    };
    audio.addEventListener('loadedmetadata', () => { if (pendingSeek !== null) { audio.currentTime = pendingSeek * audio.duration; pendingSeek = null; } });
    bar.addEventListener('pointerdown', e => { if (idx < 0) return; seeking = true; bar.setPointerCapture(e.pointerId); seekTo(e.clientX); });
    bar.addEventListener('pointermove', e => { if (seeking) seekTo(e.clientX); });
    bar.addEventListener('pointerup', () => { seeking = false; });
    bar.addEventListener('pointercancel', () => { seeking = false; });
    bar.addEventListener('keydown', e => {
        if (!audio.duration) return;
        if (e.key === 'ArrowRight') audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
        if (e.key === 'ArrowLeft') audio.currentTime = Math.max(0, audio.currentTime - 5);
    });

    // playlist ("Up Next") panel
    const queue = $('mp-queue');
    const toggleQueue = open => {
        open = open ?? queue.hidden;
        if (open) { queue.hidden = false; requestAnimationFrame(() => mp.classList.add('expanded')); }
        else { mp.classList.remove('expanded'); setTimeout(() => { if (!mp.classList.contains('expanded')) queue.hidden = true; }, 520); }
        $('mp-art').setAttribute('aria-expanded', open);
    };
    $('mp-art').addEventListener('click', () => toggleQueue());
    $('mp-info').addEventListener('click', () => toggleQueue());
    $('mp-list').addEventListener('click', e => { const b = e.target.closest('button'); if (b) load(+b.dataset.i, true); });
    document.addEventListener('click', e => { if (!mp.contains(e.target) && !queue.hidden) toggleQueue(false); });
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && !queue.hidden) toggleQueue(false); });

    // OS / headphone media keys
    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', play);
        navigator.mediaSession.setActionHandler('pause', pause);
        navigator.mediaSession.setActionHandler('nexttrack', () => load(nextIndex(1), true));
        navigator.mediaSession.setActionHandler('previoustrack', () => load(nextIndex(-1), true));
    }

    // ---- small round button until used; remembers open/closed, song and position ----
    const setOpen = open => {
        mp.classList.toggle('collapsed', !open);
        if (!open && !queue.hidden) toggleQueue(false);
        store.set('open', open);
    };
    $('mp-fab').addEventListener('click', () => setOpen(true));
    $('mp-min').addEventListener('click', e => { e.stopPropagation(); setOpen(false); });
    if (store.get('open') && !window.matchMedia('(max-width: 600px)').matches) setOpen(true);   // phones always start small
    const saved = store.get('pos');
    if (saved && TRACKS[saved.i]) {
        load(saved.i, false);
        if (saved.t > 1) pendingSeek = null, audio.addEventListener('loadedmetadata', function once() {
            audio.removeEventListener('loadedmetadata', once);
            if (saved.t < audio.duration - 2) audio.currentTime = saved.t;
        });
        $('mp-cur').textContent = fmt(saved.t || 0);
    }
    let lastSave = 0;
    audio.addEventListener('timeupdate', () => {
        const now = Date.now();
        if (now - lastSave > 3000) { lastSave = now; store.set('pos', { i: idx, t: audio.currentTime }); }
    });
    window.addEventListener('pagehide', () => { if (idx >= 0) store.set('pos', { i: idx, t: audio.currentTime }); });

    // let the rest of the page pause the music (e.g. when a video with sound opens)
    window.cvMusic = { pause, isPlaying: () => !audio.paused };
})();
