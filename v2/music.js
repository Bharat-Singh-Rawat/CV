/* =====================================================================
   Apple Music–style mini player for the v2 CV.
   Plays the same 22 tracks as the classic site (../assets/audio/).
   ===================================================================== */
(function () {
    const TRACKS = [
        "Bhairav", "Kalawati", "Malkauns", "Yaman", "Bad Bitch", "Перепутала", "Acenda o farol",
        "O Descobridor Dos Sete Mares", "Amores Lejanos", "Mi Manera de querer", "Aja mahi", "خونه ی ما",
        "Vienna Calling", "Ciudad de la furia", "ВИРТУАЛЬНАЯ ЛЮБОВЬ", "Oye mi amor", "Come", "Mas que nada",
        "Ring my bell", "Soledad y el mar", "Take 5", "Babaji ki Booti"
    ].map((title, i) => ({ title, file: `../assets/audio/track${i + 1}.mp3` }));

    const $ = id => document.getElementById(id);
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const fmt = t => !isFinite(t) ? '0:00' : `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
    // artwork: a soft two-tone gradient derived from the title, like Apple Music's generated covers
    const hue = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
    const art = t => { const h = hue(t.title); return `linear-gradient(135deg, hsl(${h} 85% 62%), hsl(${(h + 55) % 360} 80% 48%))`; };

    const ICON = {
        play: '<svg viewBox="0 0 24 24"><path d="M7 4.6v14.8a1 1 0 0 0 1.5.86l12.3-7.4a1 1 0 0 0 0-1.72L8.5 3.74A1 1 0 0 0 7 4.6z"/></svg>',
        pause: '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4.2" height="16" rx="1.2"/><rect x="13.8" y="4" width="4.2" height="16" rx="1.2"/></svg>',
        prev: '<svg viewBox="0 0 24 24"><path d="M11.5 12 21 18V6zM2.5 12 12 18V6z"/></svg>',
        next: '<svg viewBox="0 0 24 24"><path d="M12.5 12 3 18V6zM21.5 12 12 18V6z"/></svg>',
        shuffle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>',
        note: '<svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>'
    };

    document.body.insertAdjacentHTML('beforeend', `
    <div class="mp" id="mp" aria-label="Music player">
        <div class="mp-queue" id="mp-queue" hidden>
            <div class="mp-queue-head"><span>Up Next</span><span class="mp-count">${TRACKS.length} songs</span></div>
            <ol id="mp-list">${TRACKS.map((t, i) => `
                <li><button type="button" data-i="${i}"><span class="mp-q-art" style="background:${art(t)}"></span><span class="mp-q-title">${esc(t.title)}</span><span class="mp-q-eq" aria-hidden="true"><i></i><i></i><i></i></span></button></li>`).join('')}
            </ol>
        </div>
        <div class="mp-bar">
            <button type="button" class="mp-art" id="mp-art" aria-label="Show playlist" aria-expanded="false">${ICON.note}</button>
            <button type="button" class="mp-info" id="mp-info" aria-label="Show playlist">
                <span class="mp-title" id="mp-title">My playlist</span>
                <span class="mp-sub" id="mp-sub">${TRACKS.length} songs · tap play</span>
            </button>
            <div class="mp-ctrls">
                <button type="button" class="mp-btn small" id="mp-prev" aria-label="Previous">${ICON.prev}</button>
                <button type="button" class="mp-btn" id="mp-play" aria-label="Play">${ICON.play}</button>
                <button type="button" class="mp-btn small" id="mp-next" aria-label="Next">${ICON.next}</button>
                <button type="button" class="mp-btn small mp-shuffle on" id="mp-shuffle" aria-label="Shuffle play: random song" title="Shuffle play">${ICON.shuffle}</button>
            </div>
            <div class="mp-progress" id="mp-progress" role="slider" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0">
                <div class="mp-fill" id="mp-fill"></div>
            </div>
            <div class="mp-times"><span id="mp-cur">0:00</span><span id="mp-dur">0:00</span></div>
        </div>
    </div>`);

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
        $('mp-sub').textContent = `Track ${i + 1} of ${TRACKS.length}`;
        $('mp-art').style.background = art(t);
        $('mp-art').classList.add('has-art');
        document.querySelectorAll('#mp-list button').forEach(b => b.classList.toggle('current', +b.dataset.i === i));
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: 'My playlist', album: 'Bharat Singh Rawat' });
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
        else { mp.classList.remove('expanded'); setTimeout(() => { if (!mp.classList.contains('expanded')) queue.hidden = true; }, 400); }
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

    // let the rest of the page pause the music (e.g. when a video with sound opens)
    window.cvMusic = { pause, isPlaying: () => !audio.paused };
})();
