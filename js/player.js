/* ─── MUSIC PLAYER (ncmpcpp-style) — same playlist as the original jukebox ─── */
window.PLAYER = (function () {
    const $ = id => document.getElementById(id);
    const playlist = [
        { title: "Bhairav", file: "track1.mp3" }, { title: "Kalawati", file: "track2.mp3" }, { title: "Malkauns", file: "track3.mp3" },
        { title: "Yaman", file: "track4.mp3" }, { title: "Bad Bitch", file: "track5.mp3" }, { title: "Перепутала", file: "track6.mp3" },
        { title: "Acenda o farol", file: "track7.mp3" }, { title: "O Descobridor Dos Sete Mares", file: "track8.mp3" }, { title: "Amores Lejanos", file: "track9.mp3" },
        { title: "Mi Manera de querer", file: "track10.mp3" }, { title: "Aja mahi", file: "track11.mp3" }, { title: "خونه ی ما", file: "track12.mp3" },
        { title: "Vienna Calling", file: "track13.mp3" }, { title: "Ciudad de la furia", file: "track14.mp3" }, { title: "ВИРТУАЛЬНАЯ ЛЮБОВЬ", file: "track15.mp3" },
        { title: "Oye mi amor", file: "track16.mp3" }, { title: "Come", file: "track17.mp3" }, { title: "Mas que nada", file: "track18.mp3" },
        { title: "Ring my bell", file: "track19.mp3" }, { title: "Soledad y el mar", file: "track20.mp3" }, { title: "Take 5", file: "track21.mp3" },
        { title: "Babaji ki Booti", file: "track22.mp3" }
    ];
    let idx = Math.floor(Math.random() * playlist.length);
    let shuffle = false, analyser = null, data = null;
    const audio = new Audio(); audio.preload = 'none'; audio.volume = parseFloat($('mp-vol').value);
    const fmt = s => isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00';

    function load(i) {
        idx = (i + playlist.length) % playlist.length;
        audio.src = `assets/audio/${playlist[idx].file}`;
        $('mp-track').textContent = `TRACK ${String(idx + 1).padStart(2, '0')}/${playlist.length}: ${playlist[idx].title}`;
        $('mp-track').title = playlist[idx].title;
    }
    function ui() {
        const playing = !audio.paused;
        $('mp-play').textContent = playing ? '‖ pause' : '▶ play';
        $('mp-play').setAttribute('aria-label', playing ? 'Pause' : 'Play');
        const st = $('mp-state'); st.textContent = playing ? '▶ playing' : (audio.currentTime ? '‖ paused' : '■ stopped'); st.classList.toggle('hot', playing);
    }
    function initAnalyser() {
        if (analyser) return;
        try {
            const ctx = SFX.ctx; if (!ctx) return;
            const src = ctx.createMediaElementSource(audio);
            analyser = ctx.createAnalyser(); analyser.fftSize = 64;
            src.connect(analyser); analyser.connect(ctx.destination);
            data = new Uint8Array(analyser.frequencyBinCount);
        } catch (e) { analyser = null; }
    }
    const nextIdx = () => shuffle ? Math.floor(Math.random() * playlist.length) : idx + 1;
    async function play() { initAnalyser(); try { await audio.play(); } catch (e) {} ui(); }
    function pause() { audio.pause(); ui(); }
    function next() { load(nextIdx()); play(); }
    function prev() { load(shuffle ? nextIdx() : idx - 1); play(); }

    $('mp-play').addEventListener('click', () => audio.paused ? play() : pause());
    $('mp-next').addEventListener('click', next);
    $('mp-prev').addEventListener('click', prev);
    $('mp-shuffle').addEventListener('click', () => { shuffle = !shuffle; $('mp-shuffle').setAttribute('aria-pressed', String(shuffle)); });
    $('mp-vol').addEventListener('input', e => { audio.volume = parseFloat(e.target.value); });
    const seek = frac => { if (audio.duration) audio.currentTime = Math.max(0, Math.min(1, frac)) * audio.duration; };
    $('mp-progress').addEventListener('click', e => { const r = e.currentTarget.getBoundingClientRect(); seek((e.clientX - r.left) / r.width); });
    $('mp-progress').addEventListener('keydown', e => {
        if (!audio.duration) return;
        if (e.key === 'ArrowRight') seek(audio.currentTime / audio.duration + 0.05);
        if (e.key === 'ArrowLeft') seek(audio.currentTime / audio.duration - 0.05);
    });
    audio.addEventListener('timeupdate', () => {
        $('mp-bar').style.width = ((audio.currentTime / audio.duration) * 100 || 0) + '%';
        $('mp-cur').textContent = fmt(audio.currentTime); $('mp-dur').textContent = fmt(audio.duration);
    });
    audio.addEventListener('ended', next);
    audio.addEventListener('play', ui); audio.addEventListener('pause', ui);

    // spectrum bars
    const vz = $('mp-viz'), vc = vz.getContext('2d');
    (function viz() {
        vc.clearRect(0, 0, vz.width, vz.height);
        const n = 28, bw = vz.width / n;
        const col = getComputedStyle(document.documentElement).getPropertyValue('--amber').trim() || '#ffb000';
        if (analyser && !audio.paused) analyser.getByteFrequencyData(data);
        for (let i = 0; i < n; i++) {
            const v = analyser && !audio.paused ? data[Math.floor(i * data.length / n)] / 255 : 0.04;
            const h = Math.max(2, v * vz.height);
            vc.fillStyle = col; vc.globalAlpha = 0.35 + v * 0.65;
            vc.fillRect(i * bw + 1, vz.height - h, bw - 3, h);
        }
        vc.globalAlpha = 1;
        requestAnimationFrame(viz);
    })();

    load(idx); ui();
    return { play, pause, next, prev, get playing() { return !audio.paused; }, get track() { return playlist[idx].title; }, list: () => playlist.map(t => t.title), playIndex(i) { load(i); play(); } };
})();
