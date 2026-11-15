/* ─── INTERACTIVE SHELL (drop-down console, toggle with `) ──────────────
   A small fake terminal. All CV data comes from window.PROFILE (/Dossier/profile.js),
   so new jobs / papers appear here automatically.                                  */
(function () {
    const P = window.PROFILE;
    const out = document.getElementById('shell-output');
    const input = document.getElementById('shell-input');
    const card = document.getElementById('console');
    const promptEl = document.getElementById('shell-prompt');
    if (!P || !out || !input) return;

    let cwd = '~';
    const history = [];
    let histIdx = 0;
    let beamTimer = null;

    // ── helpers ──
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const strip = html => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent; };
    const slug = s => s.split(/[,/]/)[0].trim().toLowerCase().replace(/[^a-z0-9+-]+/g, '_').split('_').slice(0, 3).join('_').replace(/_+$/, '');
    const c = (cls, s) => `<span class="sh-${cls}">${s}</span>`;
    const print = (html = '') => { const line = document.createElement('div'); line.className = 'sh-line'; line.innerHTML = html; out.appendChild(line); };
    const scroll = () => { out.scrollTop = out.scrollHeight; };
    const setPrompt = () => { promptEl.innerHTML = `${c('user', 'guest@rawat-lab')}:${c('path', cwd)}$`; };

    // ── virtual filesystem built from the profile ──
    const entryFile = e => slug(e.org) + '.txt';
    const fmtEntry = e => [
        c('head', esc(e.role)) + ' @ ' + c('org', esc(e.org)),
        c('dim', esc(e.dates)),
        ...e.bullets.map(b => '  • ' + esc(strip(b)))
    ];
    const FS = {
        'experience': Object.fromEntries(P.experience.map(e => [entryFile(e), () => fmtEntry(e)])),
        'education': Object.fromEntries(P.education.map(e => [entryFile(e), () => fmtEntry(e)])),
        'publications': Object.fromEntries(P.publications.map((p, i) => [String(i + 1).padStart(2, '0') + '_' + slug(p.venue.replace(/\(.*\)/, '')) + '.txt',
            () => [c('org', esc(p.venue)), '  ' + esc(p.title)]])),
        'talks': Object.fromEntries(P.talks.map((t, i) => [String(i + 1).padStart(2, '0') + '_talk.txt', () => [c('org', esc(t.type)), '  ' + esc(t.text)]])),
        'skills.txt': () => [...P.skills.map(s => c('head', esc(strip(s.label))) + ': ' + esc(strip(s.text))), c('head', 'Core expertise') + ': ' + esc(strip(P.expertise))],
        'hobbies.txt': () => P.hobbies.map(h => `${h.icon} ${c('head', esc(h.name))}: ${esc(h.detail)}`),
        'links.txt': () => P.links.map(l => `${c('head', esc(l.label))}  ${c('dim', esc(l.url))}  ${c('dim', '(open ' + esc(l.label.toLowerCase()) + ')')}`),
        'about.txt': () => [c('head', esc(P.name)), esc(P.title), '', esc(strip(P.summary))]
    };
    const resolve = path => {
        if (!path || path === '~' || path === '.' || path === '~/') return cwd === '~' ? FS : FS[cwd];
        let p = path.replace(/^~\//, '').replace(/\/$/, '');
        if (p === '..') return FS;
        if (cwd !== '~' && !p.includes('/') && !(p in FS)) p = cwd + '/' + p;
        const parts = p.split('/');
        let node = FS;
        for (const part of parts) { if (node && typeof node === 'object' && part in node) node = node[part]; else return undefined; }
        return node;
    };
    const listing = node => Object.keys(node).map(k => typeof node[k] === 'object' ? c('dir', k + '/') : c('file', k)).join('   ');

    // ── commands ──
    const startYear = Math.min(...P.experience.concat(P.education).map(e => parseInt((e.dates.match(/\d{4}/) || [9999])[0], 10)));
    const CMDS = {
        help: () => [
            c('head', 'Available commands'),
            `  ${c('cmd', 'whoami')}            who is this?`,
            `  ${c('cmd', 'ls')} [dir]          list files (try ${c('cmd', 'ls experience')})`,
            `  ${c('cmd', 'cat')} &lt;file&gt;        read a file (Tab completes names)`,
            `  ${c('cmd', 'cd')} &lt;dir&gt;          change directory`,
            `  ${c('cmd', 'open')} &lt;link&gt;       open a project (${P.links.map(l => esc(l.label.toLowerCase())).join(', ')})`,
            `  ${c('cmd', 'goto')} &lt;section&gt;    jump to a section (${TUI.SECTIONS.join(', ')})`,
            `  ${c('cmd', 'beam')} on|off       fire the ion beam;  ${c('cmd', 'beam --energy')} 1-10 (kV), ${c('cmd', 'beam --neut')} 0-10 (mA)`,
            `  ${c('cmd', 'status')}            machine status`,
            `  ${c('cmd', 'play')} | ${c('cmd', 'pause')} | ${c('cmd', 'next')} | ${c('cmd', 'songs')}   music player`,
            `  ${c('cmd', 'theme')} green|amber|ice   ${c('cmd', 'crt')} on|off   ${c('cmd', 'sound')} on|off`,
            `  ${c('cmd', 'neofetch')}          system summary`,
            `  ${c('cmd', 'tour')}              start the guided tour`,
            `  ${c('cmd', 'portfolio')}, ${c('cmd', 'classic')}, ${c('cmd', 'home')}   other pages`,
            `  ${c('cmd', 'history')}, ${c('cmd', 'clear')}, ${c('cmd', 'date')}, ${c('cmd', 'echo')}, ${c('cmd', 'pwd')}, ${c('cmd', 'exit')}`,
            c('dim', '  ↑/↓ history · Tab completion · and maybe a few hidden ones…')
        ],
        whoami: () => FS['about.txt'](),
        pwd: () => [cwd === '~' ? '/home/guest' : '/home/guest/' + cwd],
        date: () => [new Date().toString()],
        echo: args => [esc(args.join(' '))],
        history: () => history.map((h, i) => c('dim', String(i + 1).padStart(3)) + '  ' + esc(h)),
        clear: () => { out.innerHTML = ''; return []; },
        ls: args => {
            const node = resolve(args.find(a => !a.startsWith('-')));
            if (node === undefined) return [c('err', `ls: cannot access '${esc(args[0])}': No such file or directory`)];
            if (typeof node === 'function') return [c('file', esc(args[0]))];
            return [listing(node)];
        },
        cd: args => {
            const t = (args[0] || '~').replace(/\/$/, '');
            if (t === '~' || t === '..' || t === '/') { cwd = '~'; setPrompt(); return []; }
            if (cwd === '~' && typeof FS[t] === 'object') { cwd = t; setPrompt(); return []; }
            return [c('err', `cd: ${esc(t)}: Not a directory`)];
        },
        cat: args => {
            if (!args.length) return [c('err', 'cat: missing file operand (try: ls)')];
            let lines = [];
            for (const a of args) {
                const node = resolve(a);
                if (node === undefined) lines.push(c('err', `cat: ${esc(a)}: No such file or directory`));
                else if (typeof node === 'object') {           // cat a whole directory: print every file
                    Object.values(node).forEach((f, i) => { if (i) lines.push(''); lines = lines.concat(f()); });
                } else lines = lines.concat(node());
            }
            return lines;
        },
        open: args => {
            const want = args.join(' ').toLowerCase();
            const l = P.links.find(x => x.label.toLowerCase() === want);
            if (!l) return [c('err', `open: unknown link '${esc(want)}'`), 'available: ' + P.links.map(x => esc(x.label.toLowerCase())).join(', ')];
            window.open(l.url, '_blank', 'noopener');
            return [`opening ${c('dim', esc(l.url))} …`];
        },
        beam: args => {
            const num = flag => { const i = args.indexOf(flag); return i >= 0 ? parseFloat(args[i + 1]) : NaN; };
            const lines = [];
            if (args.includes('--energy')) {
                const kv = num('--energy');
                if (!(kv >= 1 && kv <= 10)) return [c('err', 'beam: --energy must be between 1 and 10 (kV)')];
                BEAM.setV(kv); lines.push(`extraction voltage set to ${c('head', kv.toFixed(1) + ' kV')}`);
            }
            if (args.includes('--neut')) {
                const ma = num('--neut');
                if (!(ma >= 0 && ma <= 10)) return [c('err', 'beam: --neut must be between 0 and 10 (mA)')];
                BEAM.setI(ma); lines.push(`neutralizer current set to ${c('head', ma.toFixed(1) + ' mA')}`);
            }
            if (args[0] === 'on') { BEAM.fire(true, 4000); lines.push(c('warn', '⚠ BEAM ON') + ` — divergence ${BEAM.divergenceDeg.toFixed(1)}° · auto-off in 4 s`); }
            else if (args[0] === 'off') { BEAM.fire(false); lines.push('beam off. interlocks reset.'); }
            if (lines.length) { if (lines.length && args[0] !== 'off') lines.push(c('dim', 'watch the ion-source.service panel →')); return lines; }
            return ['usage: beam on | beam off | beam --energy &lt;1-10&gt; | beam --neut &lt;0-10&gt;'];
        },
        status: () => [
            `BEAM        ${BEAM.firing ? c('warn', 'ON') : c('ok', 'STANDBY')}`,
            `EXTRACTION  ${BEAM.V.toFixed(1)} kV`,
            `NEUTRALIZER ${BEAM.I.toFixed(1)} mA`,
            `DIVERGENCE  ${BEAM.divergenceDeg.toFixed(1)}°`,
            `GRID WEAR   ${BEAM.wear.toFixed(1)} %   (ions deposited: ${BEAM.ions.toLocaleString()})`,
            `MUSIC       ${PLAYER.playing ? c('ok', '▶ ' + esc(PLAYER.track)) : c('dim', 'stopped')}`,
            `INJECTOR    ${c('ok', 'ONLINE')} @ ${esc(P.experience[0].org.split(',')[0])}`
        ],
        goto: args => {
            const t = (args[0] || '').toLowerCase().replace(/\/$/, '');
            if (!TUI.SECTIONS.includes(t)) return [c('err', `goto: unknown section '${esc(t)}'`), 'sections: ' + TUI.SECTIONS.join(', ')];
            TUI.consoleOpen(false); TUI.goto(t); return [`→ ${t}`];
        },
        play: args => { const n = parseInt(args[0], 10); if (n >= 1 && n <= PLAYER.list().length) PLAYER.playIndex(n - 1); else PLAYER.play(); return ['♪ ' + esc(PLAYER.track)]; },
        pause: () => { PLAYER.pause(); return ['‖ paused']; },
        next: () => { PLAYER.next(); return ['⟫ ' + esc(PLAYER.track)]; },
        songs: () => PLAYER.list().map((t, i) => c('dim', String(i + 1).padStart(2, '0')) + '  ' + esc(t)).concat([c('dim', 'play a specific one: ') + c('cmd', 'play 7')]),
        theme: args => {
            const t = (args[0] || '').toLowerCase();
            if (!['green', 'amber', 'ice'].includes(t)) return ['usage: theme green | amber | ice'];
            TUI.setTheme(t); return [`palette → ${c('head', t)}`];
        },
        crt: args => { const on = args[0] !== 'off'; TUI.setCrt(on); return [`CRT scanlines ${on ? 'on' : 'off'}`]; },
        sound: args => { SFX.enabled = args[0] !== 'off'; return [`sound effects ${SFX.enabled ? 'on' : 'off'}`]; },
        portfolio: () => { window.open('https://bharatbharat22.wixsite.com/website', '_blank', 'noopener'); return ['opening full portfolio…']; },
        classic: () => { location.href = 'classic.html'; return ['loading classic layout…']; },
        home: () => { location.href = '/Dossier/'; return ['back to the Dossier portal…']; },
        neofetch: () => {
            const art = ['   ╭──────────╮ ', '   │  ◉ ═══▶  │ ', '   │  ION SRC │ ', '   ╰──┬───┬───╯ ', '      ╧   ╧    ', '               '];
            const info = [
                c('user', 'guest') + '@' + c('user', 'rawat-lab'),
                c('head', 'OS') + ':       BeamOS ' + new Date().getFullYear() + ' (Terminal_View)',
                c('head', 'Host') + ':     ' + esc(P.experience[0].org),
                c('head', 'Role') + ':     ' + esc(P.experience[0].role),
                c('head', 'Uptime') + ':   ' + ((strip(P.summary).match(/(\d+\+?)\s*years/) || [])[1] || (new Date().getFullYear() - startYear)) + ' years in the field',
                c('head', 'Packages') + ': ' + P.publications.length + ' publications, ' + P.talks.length + ' talks'
            ];
            return art.map((a, i) => c('art', a) + (info[i] || ''));
        },
        tour: () => { setTimeout(() => document.getElementById('tour-btn')?.click(), 50); TUI.consoleOpen(false); return ['starting guided tour… (Esc to abort)']; },
        exit: () => { setTimeout(() => TUI.consoleOpen(false), 250); return ['logout.']; },
        // hidden easter eggs
        sudo: args => {
            const a = args.join(' ');
            if (/^hire( bharat)?/.test(a)) return [c('ok', '[sudo] permission granted.'), 'Excellent decision. Scroll down for the full dossier, or ' + c('cmd', 'cat links.txt') + ' to see projects.'];
            if (/rm\s+-rf/.test(a)) return [c('err', '⚠ INTERLOCK TRIPPED: radiation-protection system refused the command.'), c('dim', '(ex-RP engineer on duty — nice try)')];
            return [c('err', 'guest is not in the sudoers file. This incident will be reported to the shift leader.')];
        },
        rm: () => [c('err', 'rm: permission denied (read-only dossier)')],
        vim: () => ['you are now stuck in vim forever.', c('dim', '(just kidding — type :q)')],
        ':q': () => ['phew.'],
        coffee: () => ['☕ brewing… shift crews run on caffeine.'],
        chess: () => { setTimeout(() => { TUI.consoleOpen(false); TUI.goto('hobbies'); setTimeout(() => TUI.knight(document.querySelector('tr.proc.clickable')), 700); }, 300); return ['♞ e4. your move.']; },
        antimatter: () => ['annihilating… 511 keV γ detected ×2 ✓']
    };

    function run(raw) {
        const line = raw.trim();
        print(`${promptEl.innerHTML} ${esc(raw)}`);
        if (!line) return scroll();
        history.push(line); histIdx = history.length;
        const [cmd, ...args] = line.split(/\s+/);
        const fn = Object.prototype.hasOwnProperty.call(CMDS, cmd.toLowerCase()) ? CMDS[cmd.toLowerCase()] : null;
        const res = fn ? fn(args) : [c('err', `${esc(cmd)}: command not found`) + c('dim', '  (type help)')];
        (res || []).forEach(l => print(l));
        scroll();
    }

    function complete() {
        const val = input.value;
        const parts = val.split(/\s+/);
        if (parts.length === 1) {                            // command name
            const m = Object.keys(CMDS).filter(k => !k.startsWith('_') && k.startsWith(parts[0]));
            if (m.length === 1) input.value = m[0] + ' ';
            else if (m.length > 1) { print(`${promptEl.innerHTML} ${esc(val)}`); print(m.map(x => c('cmd', x)).join('   ')); scroll(); }
            return;
        }
        const word = parts[parts.length - 1];
        const slash = word.lastIndexOf('/');
        const dir = slash >= 0 ? word.slice(0, slash) : '';
        const base = slash >= 0 ? word.slice(slash + 1) : word;
        const node = dir ? resolve(dir) : (cwd === '~' ? FS : FS[cwd]);
        if (!node || typeof node !== 'object') return;
        const m = Object.keys(node).filter(k => k.startsWith(base)).map(k => k + (typeof node[k] === 'object' ? '/' : ''));
        if (m.length === 1) { parts[parts.length - 1] = (dir ? dir + '/' : '') + m[0]; input.value = parts.join(' '); }
        else if (m.length > 1) {
            let pre = m[0]; m.forEach(x => { while (!x.startsWith(pre)) pre = pre.slice(0, -1); });   // common prefix
            parts[parts.length - 1] = (dir ? dir + '/' : '') + pre; input.value = parts.join(' ');
            print(`${promptEl.innerHTML} ${esc(val)}`); print(m.map(x => x.endsWith('/') ? c('dir', x) : c('file', x)).join('   ')); scroll();
        }
    }

    input.addEventListener('keydown', e => {
        if (e.key === '`' || e.key === 'Escape') return;    // handled by the console toggle in tui.js
        e.stopPropagation();                                 // keep other page shortcuts out of the shell
        if (e.key.length === 1) SFX.key();
        if (e.key === 'Enter') { run(input.value); input.value = ''; }
        else if (e.key === 'Tab') { e.preventDefault(); complete(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); if (histIdx > 0) input.value = history[--histIdx]; }
        else if (e.key === 'ArrowDown') { e.preventDefault(); histIdx = Math.min(history.length, histIdx + 1); input.value = history[histIdx] || ''; }
        else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); out.innerHTML = ''; }
    });
    // clicking inside the console focuses the input
    card.addEventListener('click', () => { if (!window.getSelection().toString()) input.focus({ preventScroll: true }); });

    // ── boot banner ──
    setPrompt();
    print(c('dim', `BeamOS shell — last login: ${new Date().toDateString()} from ${location.hostname || 'localhost'}`));
    print(`Welcome to ${c('head', esc(P.name))}'s lab terminal. Type ${c('cmd', 'help')} to begin, or try ${c('cmd', 'neofetch')}.`);
})();
