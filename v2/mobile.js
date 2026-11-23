/* Phone tidy-up (max-width 600px). Desktop is untouched.
   - top bar: search, language and sound move into the section menu; "Get in touch" is an icon (CSS)
   - music button: slides away while you scroll, comes back when you stop
   - publications: the five most recent (plus starred ones) show; the rest open with "All publications"
   - skills: each group is a tap-to-open row; the "How it connects" graph is hidden (CSS)
   (career cards, the mini globe and the swipe rows for lab / offer are handled in v2.js + v2.css) */
(() => {
    const phone = matchMedia('(max-width: 600px)');
    if (!phone.matches) return;
    const $ = id => document.getElementById(id);

    // ---------- top bar: tools into the menu ----------
    const nav = $('ln-nav');
    if (nav) {
        const tools = document.createElement('div');
        tools.className = 'ln-tools';
        ['spot-btn', 'lang-pick', 'sfx-toggle'].forEach(id => { const el = $(id); if (el) tools.appendChild(el); });
        if (tools.children.length) nav.appendChild(tools);
        // close the menu once the search opens, so the two don't stack
        $('spot-btn')?.addEventListener('click', () => { $('topbar')?.classList.remove('menu-open'); $('ln-toggle')?.setAttribute('aria-expanded', 'false'); });
    }

    // ---------- music button: out of the way while scrolling ----------
    const mp = $('mp');
    if (mp) {
        let t = 0;
        addEventListener('scroll', () => {
            if (!mp.classList.contains('collapsed')) return;          // player open: leave it alone
            mp.classList.add('mp-away');
            clearTimeout(t); t = setTimeout(() => mp.classList.remove('mp-away'), 900);
        }, { passive: true });
    }

    // ---------- publications: five newest + starred ----------
    const pubSec = $('publications'), list = $('pubs'), more = $('pub-more');
    if (pubSec && list) {
        const pubs = [...list.querySelectorAll('.pub')];
        let shown = 0;
        pubs.forEach(p => { if (shown < 5 || p.classList.contains('star')) shown += p.classList.contains('star') ? 0 : 1; else p.classList.add('pub-x'); });
        list.querySelectorAll('.pub-year').forEach(y => { if (![...y.querySelectorAll('.pub')].some(p => !p.classList.contains('pub-x'))) y.classList.add('pub-x'); });
        if (pubs.some(p => p.classList.contains('pub-x')) && more) {
            more.addEventListener('toggle', () => pubSec.classList.toggle('all', more.open));
        } else pubSec.classList.add('all');                           // nothing hidden, or no button to show them
    }

    // ---------- skills: tap a group to open it ----------
    document.querySelectorAll('#rack .module').forEach(m => {
        const label = m.querySelector('.label'); if (!label) return;
        label.setAttribute('role', 'button'); label.setAttribute('tabindex', '0'); label.setAttribute('aria-expanded', 'false');
        const flip = () => { const open = m.classList.toggle('open'); label.setAttribute('aria-expanded', String(open)); };
        label.addEventListener('click', flip);
        label.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
    });
})();
